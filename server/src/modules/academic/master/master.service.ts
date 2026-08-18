import { IAcademicMasterRepository } from './repositories/master.repository';
import { CreateClassDTO, AssignHomeroomDTO, ClassDetailDTO } from './dtos/master.dto';
import { ACADEMIC_MASTER_EVENTS } from './events/master.events';
import { IEventPublisher } from '../../authorization/service';
import { IRequestContext } from '../../../core/context/request-context.service';
import { ConflictException, BusinessRuleException, ResourceNotFoundException } from '../../../core/exceptions/app.exception';
// import { AcademicCalendarEngine } from '../engine/academic-calendar.engine'; // Can inject to validate if planning is allowed

export class AcademicMasterService {
  constructor(
    private readonly repo: IAcademicMasterRepository,
    private readonly eventPublisher: IEventPublisher,
    // private readonly calendarEngine: AcademicCalendarEngine 
  ) {}

  async createClass(data: CreateClassDTO, ctx: IRequestContext): Promise<ClassDetailDTO> {
    // Optional: await this.calendarEngine.assertActionAllowed('CREATE_CLASS', ctx.identity?.tenantId!);

    // 1. Business Rule: Code uniqueness per Academic Year
    const existing = await this.repo.findClassByCode(data.code, data.tenantId, data.academicYearId);
    if (existing) {
      throw new ConflictException(`Class code '${data.code}' already exists in this academic year.`);
    }

    // 2. Persist
    const newClass = await this.repo.createClass(data);

    // 3. Emit Domain Event
    this.publishEvent(ACADEMIC_MASTER_EVENTS.CLASS_CREATED, {
      classId: newClass.id,
      code: newClass.code,
      academicYearId: newClass.academicYearId,
      majorId: data.majorId,
      changedBy: ctx.identity?.userId,
    }, ctx);

    return newClass;
  }

  async assignHomeroomTeacher(data: AssignHomeroomDTO, expectedUpdatedAt: Date, ctx: IRequestContext): Promise<void> {
    const cls = await this.repo.findClassById(data.classId, data.tenantId);
    if (!cls) throw new ResourceNotFoundException('Class', data.classId);

    // 1. Business Rule: One teacher cannot be homeroom for multiple classes in the same Academic Year
    const activeAssignments = await this.repo.countActiveHomerooms(data.teacherId, data.academicYearId, data.tenantId);
    if (activeAssignments > 0) {
      throw new BusinessRuleException('Teacher is already assigned as a homeroom teacher for another class in this academic year.');
    }

    // 2. Persist with Optimistic Concurrency Control
    try {
      await this.repo.assignHomeroom(data.classId, data.teacherId, data.tenantId, expectedUpdatedAt);
    } catch (e: any) {
      if (e.message === 'OCC_FAILED') {
        throw new ConflictException('The class record was modified by another user. Please refresh and try again.');
      }
      throw e;
    }

    // 3. Emit Domain Event
    this.publishEvent(ACADEMIC_MASTER_EVENTS.HOMEROOM_ASSIGNED, {
      classId: data.classId,
      teacherId: data.teacherId,
      academicYearId: data.academicYearId,
      changedBy: ctx.identity?.userId,
    }, ctx);
  }

  // --- Private Helpers ---
  private publishEvent(eventName: string, payload: any, ctx: IRequestContext): void {
    this.eventPublisher.publish({
      eventId: require('crypto').randomUUID(),
      eventName,
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      tenantId: ctx.identity?.tenantId!,
      userId: ctx.identity?.userId,
      correlationId: ctx.correlationId,
      requestId: ctx.requestId,
      metadata: payload
    });
  }
}
