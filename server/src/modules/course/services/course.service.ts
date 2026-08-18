import { CreateCourseDTO, TransitionCourseDTO, CourseDetailDTO, CourseStatus } from '../dtos/course.dto';
import { CourseStateMachine } from '../engine/course.state-machine';
import { COURSE_EVENTS } from '../events/course.events';
import { IEventPublisher } from '../../authorization/service';
import { IRequestContext } from '../../../core/context/request-context.service';
import { ConflictException, BusinessRuleException, ResourceNotFoundException } from '../../../core/exceptions/app.exception';

// Interfaces for DI
export interface ICourseRepository {
  findById(id: string, tenantId: string): Promise<CourseDetailDTO | null>;
  findDuplicate(classId: string, subjectId: string, semesterId: string, tenantId: string): Promise<boolean>;
  create(data: CreateCourseDTO): Promise<CourseDetailDTO>;
  
  // Important: Repository handles the Version Increment atomically!
  updateStatus(id: string, tenantId: string, status: CourseStatus, expectedVersion: number): Promise<CourseDetailDTO>;
}

export interface IAcademicCalendarEngine {
  assertActionAllowed(action: string, tenantId: string): Promise<void>;
}

/**
 * Course Aggregate Root Service.
 * Orchestrates all Course creation, status transitions, and version increments.
 */
export class CourseService {
  constructor(
    private readonly repo: ICourseRepository,
    private readonly calendarEngine: IAcademicCalendarEngine,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async createCourse(data: CreateCourseDTO, ctx: IRequestContext): Promise<CourseDetailDTO> {
    const tenantId = ctx.identity?.tenantId!;

    // 1. Calendar Engine Integration
    // Business Rule: Courses can only be created during DRAFT or PLANNING semester states
    await this.calendarEngine.assertActionAllowed('CREATE_COURSE', tenantId);

    // 2. Aggregate Validation: Prevent Duplicate Courses (Subject + Class + Semester)
    const isDuplicate = await this.repo.findDuplicate(data.classId, data.subjectId, data.semesterId, tenantId);
    if (isDuplicate) {
      throw new ConflictException('A course for this subject and class already exists in the current semester.');
    }

    // 3. Persist (Starts with version = 1, status = DRAFT)
    const newCourse = await this.repo.create(data);

    // 4. Emit Domain Event
    this.publishEvent(COURSE_EVENTS.COURSE_CREATED, newCourse, ctx);

    return newCourse;
  }

  async activateCourse(courseId: string, data: TransitionCourseDTO, ctx: IRequestContext): Promise<void> {
    const tenantId = ctx.identity?.tenantId!;
    
    const course = await this.repo.findById(courseId, tenantId);
    if (!course) throw new ResourceNotFoundException('Course', courseId);

    // 1. State Machine Validation
    CourseStateMachine.validateTransition(course.status, 'ACTIVE');

    // 2. Execute Transition with Version-Based OCC
    // The repository MUST throw an error if expectedVersion !== currentDBVersion,
    // and MUST increment the version by 1 on success.
    try {
      const updatedCourse = await this.repo.updateStatus(courseId, tenantId, 'ACTIVE', data.expectedVersion);
      
      // 3. Emit Domain Event (Submodules like Attendance can now listen to this)
      this.publishEvent(COURSE_EVENTS.COURSE_ACTIVATED, updatedCourse, ctx);
    } catch (error: any) {
      if (error.message === 'OCC_FAILED') {
         throw new ConflictException('Course was modified by another user. Version mismatch.');
      }
      throw error;
    }
  }

  // --- Helpers ---
  private publishEvent(eventName: string, course: CourseDetailDTO, ctx: IRequestContext): void {
    this.eventPublisher.publish({
      eventId: require('crypto').randomUUID(),
      eventName,
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      tenantId: ctx.identity?.tenantId!,
      userId: ctx.identity?.userId,
      correlationId: ctx.correlationId,
      requestId: ctx.requestId,
      metadata: {
        courseId: course.id,
        subjectId: course.subjectId,
        classId: course.classId,
        teacherId: course.teacherId,
        version: course.version, // Extremely critical for mobile sync
      }
    });
  }
}
