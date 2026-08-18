import { EnrollmentStatus } from '../dtos/enrollment.dto';
import { BusinessRuleException } from '../../../../core/exceptions/app.exception';

export class EnrollmentStateMachine {
  private static readonly TRANSITIONS: Record<EnrollmentStatus, EnrollmentStatus[]> = {
    PENDING: ['ACTIVE', 'WITHDRAWN', 'ARCHIVED'],
    ACTIVE: ['TRANSFERRED', 'GRADUATED', 'WITHDRAWN', 'ARCHIVED'],
    TRANSFERRED: ['ARCHIVED'],
    GRADUATED: ['ARCHIVED'],
    WITHDRAWN: ['ACTIVE', 'ARCHIVED'], // Restore withdrawn to active
    ARCHIVED: [], // Terminal state
  };

  static validateTransition(current: EnrollmentStatus, next: EnrollmentStatus): void {
    if (current === next) return;
    
    const allowed = this.TRANSITIONS[current] || [];
    if (!allowed.includes(next)) {
      throw new BusinessRuleException(
        `Invalid Enrollment state transition from ${current} to ${next}.`
      );
    }
  }
}
