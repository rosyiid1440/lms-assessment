import { UserStatus } from './dtos/user.dto';
import { BusinessRuleException } from '../../../core/exceptions/app.exception';

/**
 * Validates allowable state transitions for a User.
 */
export class UserStateMachine {
  private static readonly TRANSITIONS: Record<UserStatus, UserStatus[]> = {
    PENDING: ['ACTIVE', 'ARCHIVED'],
    ACTIVE: ['SUSPENDED', 'LOCKED', 'ARCHIVED'],
    SUSPENDED: ['ACTIVE', 'ARCHIVED'],
    LOCKED: ['ACTIVE', 'ARCHIVED'],
    ARCHIVED: ['ACTIVE'], // Restore scenario
  };

  /**
   * Evaluates if a transition is allowed.
   * Throws BusinessRuleException if invalid.
   */
  static validateTransition(currentStatus: UserStatus, nextStatus: UserStatus): void {
    if (currentStatus === nextStatus) {
      return; // No-op
    }

    const allowedNextStates = this.TRANSITIONS[currentStatus] || [];
    if (!allowedNextStates.includes(nextStatus)) {
      throw new BusinessRuleException(
        `Invalid status transition from ${currentStatus} to ${nextStatus}`
      );
    }
  }
}
