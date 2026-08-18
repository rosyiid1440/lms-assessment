import { CreateAssignmentDTO, AssignmentDetailDTO, AssignmentStatus } from '../dtos/assignment.dto';
import { AssignmentStateMachine } from '../engine/assignment.state-machine';
import { ASSIGNMENT_EVENTS } from '../events/assignment.events';
import { IEventPublisher } from '../../authorization/service';
import { IRequestContext } from '../../../core/context/request-context.service';
import { ConflictException, ResourceNotFoundException } from '../../../core/exceptions/app.exception';
import { GlobalMetrics } from '../../../core/observability/metric.publisher';

// Mock dependencies
export interface IAssignmentCommandRepository {
  create(data: CreateAssignmentDTO, status: AssignmentStatus): Promise<AssignmentDetailDTO>;
  updateStatus(id: string, tenantId: string, status: AssignmentStatus, expectedVersion: number): Promise<AssignmentDetailDTO>;
  findById(id: string, tenantId: string): Promise<AssignmentDetailDTO | null>;
}

export interface IAcademicCalendarEngine {
  assertActionAllowed(action: string, tenantId: string): Promise<void>;
}

export class AssignmentService {
  constructor(
    private readonly repo: IAssignmentCommandRepository,
    private readonly calendarEngine: IAcademicCalendarEngine,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async createAssignment(data: CreateAssignmentDTO, ctx: IRequestContext): Promise<AssignmentDetailDTO> {
    const startTime = process.hrtime();
    const tenantId = ctx.identity?.tenantId!;

    // 1. Calendar Validation (Source of Truth)
    await this.calendarEngine.assertActionAllowed('CREATE_ASSIGNMENT', tenantId);

    // 2. Logic: Determine initial status
    let initialStatus: AssignmentStatus = 'DRAFT';
    if (data.scheduledAt && data.scheduledAt > new Date()) {
      initialStatus = 'SCHEDULED';
    } else if (data.dueDate > new Date()) {
      initialStatus = 'OPEN'; // Open immediately
    }

    // 3. Persist
    const assignment = await this.repo.create(data, initialStatus);

    // 4. Observability & Metrics target (<30ms typical creation mapping)
    const diff = process.hrtime(startTime);
    GlobalMetrics.recordHistogram('assignment_creation_latency_ms', diff[0] * 1e3 + diff[1] * 1e-6);

    // 5. Emit Event for Notifications (H-3, H-1 tracking setup)
    this.publishEvent(ASSIGNMENT_EVENTS.ASSIGNMENT_CREATED, assignment, ctx);
    
    if (initialStatus === 'OPEN') {
      this.publishEvent(ASSIGNMENT_EVENTS.ASSIGNMENT_OPENED, assignment, ctx);
    }

    return assignment;
  }

  async transitionStatus(
    assignmentId: string, 
    nextStatus: AssignmentStatus, 
    expectedVersion: number, 
    ctx: IRequestContext
  ): Promise<void> {
    const tenantId = ctx.identity?.tenantId!;
    const assignment = await this.repo.findById(assignmentId, tenantId);
    if (!assignment) throw new ResourceNotFoundException('Assignment', assignmentId);

    // State Machine Check
    AssignmentStateMachine.validateTransition(assignment.status, nextStatus);

    // Calendar check for releasing grades
    if (nextStatus === 'PUBLISHED') {
      await this.calendarEngine.assertActionAllowed('PUBLISH_GRADES', tenantId);
    }

    try {
      const updated = await this.repo.updateStatus(assignmentId, tenantId, nextStatus, expectedVersion);
      
      const eventMap: Record<string, string> = {
        OPEN: ASSIGNMENT_EVENTS.ASSIGNMENT_OPENED,
        CLOSED: ASSIGNMENT_EVENTS.ASSIGNMENT_CLOSED,
        PUBLISHED: ASSIGNMENT_EVENTS.ASSIGNMENT_PUBLISHED
      };

      if (eventMap[nextStatus]) {
        this.publishEvent(eventMap[nextStatus], updated, ctx);
      }
    } catch (e: any) {
      if (e.message === 'OCC_FAILED') throw new ConflictException('Assignment modified by another user. Refresh required.');
      throw e;
    }
  }

  private publishEvent(eventName: string, data: AssignmentDetailDTO, ctx: IRequestContext): void {
    this.eventPublisher.publish({
      eventId: require('crypto').randomUUID(),
      eventName,
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      tenantId: ctx.identity?.tenantId!,
      correlationId: ctx.correlationId,
      requestId: ctx.requestId,
      metadata: {
        assignmentId: data.id,
        courseId: data.courseId,
        status: data.status,
        version: data.version
      }
    });
  }
}
