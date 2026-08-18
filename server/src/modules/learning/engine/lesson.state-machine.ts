import { LessonStatus } from '../dtos/learning.dto';
import { BusinessRuleException } from '../../../core/exceptions/app.exception';

export class LessonStateMachine {
  private static readonly TRANSITIONS: Record<LessonStatus, LessonStatus[]> = {
    DRAFT: ['REVIEW', 'PUBLISHED', 'ARCHIVED'],
    REVIEW: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
    PUBLISHED: ['DRAFT', 'ARCHIVED'], // Revert to draft if edits needed
    ARCHIVED: ['DRAFT'], // Restore scenario
  };

  /**
   * Enforces rigorous lesson lifecycle.
   */
  static validateTransition(current: LessonStatus, next: LessonStatus): void {
    if (current === next) return;
    
    const allowed = this.TRANSITIONS[current] || [];
    if (!allowed.includes(next)) {
      throw new BusinessRuleException(
        `Invalid Lesson state transition from ${current} to ${next}.`
      );
    }
  }
}
