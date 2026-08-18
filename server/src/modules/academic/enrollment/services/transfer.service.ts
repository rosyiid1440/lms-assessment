import { TransferStudentDTO, EnrollmentSummaryDTO } from '../dtos/enrollment.dto';
import { EnrollmentStateMachine } from '../engine/enrollment.state-machine';
import { ENROLLMENT_EVENTS } from '../events/enrollment.events';
import { IEventPublisher } from '../../../authorization/service';
import { IRequestContext } from '../../../../core/context/request-context.service';
import { ConflictException, ResourceNotFoundException, BusinessRuleException } from '../../../../core/exceptions/app.exception';

// Mock Interfaces for DI
export interface IEnrollmentRepository {
  findById(id: string, tenantId: string): Promise<EnrollmentSummaryDTO | null>;
  findActiveEnrollment(studentId: string, semesterId: string, tenantId: string): Promise<EnrollmentSummaryDTO | null>;
  updateStatus(id: string, tenantId: string, status: string, expectedUpdatedAt: Date): Promise<void>;
  create(data: any): Promise<EnrollmentSummaryDTO>;
  transaction<T>(callback: (tx: any) => Promise<T>): Promise<T>;
}

export interface IAcademicCalendarEngine {
  assertActionAllowed(action: string, tenantId: string): Promise<void>;
}

/**
 * Single Responsibility Service: Handles Class Transfers
 */
export class TransferService {
  constructor(
    private readonly repo: IEnrollmentRepository,
    private readonly calendarEngine: IAcademicCalendarEngine,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async transferStudent(data: TransferStudentDTO, expectedUpdatedAt: Date, ctx: IRequestContext): Promise<EnrollmentSummaryDTO> {
    const tenantId = ctx.identity?.tenantId!;

    // 1. Calendar Engine Integration: Block transfer if semester is CLOSED
    await this.calendarEngine.assertActionAllowed('TRANSFER_STUDENT', tenantId);

    // 2. Fetch Current Enrollment
    const currentEnrollment = await this.repo.findById(data.enrollmentId, tenantId);
    if (!currentEnrollment) {
      throw new ResourceNotFoundException('Enrollment', data.enrollmentId);
    }

    // 3. Concurrency Check
    if (currentEnrollment.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      throw new ConflictException('Enrollment record was modified by another administrator.');
    }

    // 4. State Machine Validation (ACTIVE -> TRANSFERRED)
    EnrollmentStateMachine.validateTransition(currentEnrollment.status, 'TRANSFERRED');

    // 5. Transaction Boundary (Unit of Work)
    const newEnrollment = await this.repo.transaction(async (tx) => {
      // Mark old as TRANSFERRED
      await tx.updateStatus(currentEnrollment.id, tenantId, 'TRANSFERRED', expectedUpdatedAt);

      // Create new ACTIVE enrollment in the new class
      return tx.create({
        tenantId,
        studentId: currentEnrollment.studentId,
        classId: data.newClassId,
        academicYearId: currentEnrollment.academicYearId, // Maintain Year
        semesterId: (currentEnrollment as any).semesterId, // Assuming it exists on full entity
        status: 'ACTIVE',
      });
    });

    // 6. Immutable Domain Event
    this.eventPublisher.publish({
      eventId: require('crypto').randomUUID(),
      eventName: ENROLLMENT_EVENTS.STUDENT_TRANSFERRED,
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      tenantId,
      userId: ctx.identity?.userId,
      correlationId: ctx.correlationId,
      requestId: ctx.requestId,
      metadata: {
        enrollmentId: newEnrollment.id,
        studentId: newEnrollment.studentId,
        classId: newEnrollment.classId,
        academicYearId: newEnrollment.academicYearId,
        oldEnrollmentId: currentEnrollment.id,
        oldClassId: currentEnrollment.classId,
        reason: data.reason
      }
    });

    return newEnrollment;
  }
}
