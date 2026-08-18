import { AcademicStateMachine } from './academic.state-machine';
import { ACADEMIC_EVENTS } from '../events/academic.events';
import { AcademicYearStatus, SemesterStatus, AcademicSummaryDTO, SemesterSummaryDTO } from '../dtos/academic.dto';
import { BusinessRuleException } from '../../../core/exceptions/app.exception';
import { IEventPublisher } from '../../authorization/service'; // Abstract publisher
import { IRequestContext } from '../../../core/context/request-context.service';

/**
 * Interfaces for Repositories (To be implemented via Prisma)
 */
export interface IAcademicYearRepository {
  findById(id: string, tenantId: string): Promise<AcademicSummaryDTO | null>;
  findActiveYear(tenantId: string): Promise<AcademicSummaryDTO | null>;
  updateStatus(id: string, tenantId: string, status: AcademicYearStatus, expectedUpdatedAt: Date): Promise<AcademicSummaryDTO>;
}

export interface ISemesterRepository {
  findById(id: string, tenantId: string): Promise<SemesterSummaryDTO | null>;
  findActiveSemester(tenantId: string): Promise<SemesterSummaryDTO | null>;
  updateStatus(id: string, tenantId: string, status: SemesterStatus, expectedUpdatedAt: Date): Promise<SemesterSummaryDTO>;
}

/**
 * The Central Source of Truth for LMS Time and Rules.
 */
export class AcademicCalendarEngine {
  constructor(
    private readonly yearRepo: IAcademicYearRepository,
    private readonly semesterRepo: ISemesterRepository,
    private readonly eventPublisher: IEventPublisher
  ) {}

  // ---------------------------------------------------------
  // GLOBAL POLICIES (Exposed to other modules)
  // ---------------------------------------------------------

  /**
   * Evaluates if a specific action (e.g., 'CREATE_ASSIGNMENT') is allowed 
   * under the current semester state.
   */
  async assertActionAllowed(action: string, tenantId: string): Promise<void> {
    const activeSemester = await this.semesterRepo.findActiveSemester(tenantId);
    if (!activeSemester) {
      throw new BusinessRuleException('No active semester found. This action requires a running semester.');
    }

    const state = activeSemester.status;

    switch (action) {
      case 'CREATE_ASSIGNMENT':
      case 'SUBMIT_ATTENDANCE':
      case 'TAKE_QUIZ':
        if (state !== 'RUNNING') {
          throw new BusinessRuleException(`Action '${action}' is only allowed when semester is RUNNING (Current: ${state}).`);
        }
        break;

      case 'INPUT_FINAL_GRADES':
        if (state !== 'GRADING' && state !== 'RUNNING') {
          throw new BusinessRuleException(`Action '${action}' is only allowed during RUNNING or GRADING phases.`);
        }
        break;

      case 'CREATE_COURSE':
      case 'CREATE_SCHEDULE':
        if (state !== 'PLANNING' && state !== 'DRAFT') {
           throw new BusinessRuleException(`Action '${action}' must be done during DRAFT or PLANNING phases.`);
        }
        break;
        
      default:
        throw new BusinessRuleException(`Unknown academic action: ${action}`);
    }
  }

  // ---------------------------------------------------------
  // STATE MACHINE EXECUTORS
  // ---------------------------------------------------------

  async activateAcademicYear(yearId: string, expectedUpdatedAt: Date, ctx: IRequestContext): Promise<void> {
    const tenantId = ctx.identity?.tenantId!;
    const year = await this.yearRepo.findById(yearId, tenantId);
    if (!year) throw new BusinessRuleException('Academic Year not found');

    // Rule: Only ONE Active Year allowed per school
    const currentActive = await this.yearRepo.findActiveYear(tenantId);
    if (currentActive && currentActive.id !== yearId) {
      throw new BusinessRuleException(`Cannot activate. Academic Year '${currentActive.name}' is currently active. Close it first.`);
    }

    AcademicStateMachine.validateYearTransition(year.status, 'ACTIVE');

    const updated = await this.yearRepo.updateStatus(yearId, tenantId, 'ACTIVE', expectedUpdatedAt);

    this.publishEvent(ACADEMIC_EVENTS.YEAR_ACTIVATED, updated, ctx);
  }

  async closeSemester(semesterId: string, expectedUpdatedAt: Date, ctx: IRequestContext): Promise<void> {
    const tenantId = ctx.identity?.tenantId!;
    const semester = await this.semesterRepo.findById(semesterId, tenantId);
    if (!semester) throw new BusinessRuleException('Semester not found');

    AcademicStateMachine.validateSemesterTransition(semester.status, 'CLOSED');

    const updated = await this.semesterRepo.updateStatus(semesterId, tenantId, 'CLOSED', expectedUpdatedAt);

    // This event is CRITICAL. 
    // Assignment Module will listen to this and lock all submissions.
    // Grade Module will finalize report cards.
    this.publishEvent(ACADEMIC_EVENTS.SEMESTER_CLOSED, updated, ctx);
  }

  // ---------------------------------------------------------
  // EVENT HELPER
  // ---------------------------------------------------------

  private publishEvent(eventName: string, entity: AcademicSummaryDTO | SemesterSummaryDTO, ctx: IRequestContext): void {
    const isYear = 'startDate' in entity; // simple type guard
    
    this.eventPublisher.publish({
      eventId: require('crypto').randomUUID(),
      eventName,
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      tenantId: ctx.identity?.tenantId!,
      userId: ctx.identity?.userId,
      correlationId: ctx.correlationId,
      requestId: ctx.requestId,
      metadata: isYear 
        ? { academicYearId: entity.id, name: entity.name, status: entity.status }
        : { semesterId: entity.id, academicYearId: (entity as SemesterSummaryDTO).academicYearId, name: entity.name, status: entity.status }
    });
  }
}
