import { CourseStatus } from '../dtos/course.dto';
import { BusinessRuleException } from '../../../core/exceptions/app.exception';

export class CourseStateMachine {
  private static readonly TRANSITIONS: Record<CourseStatus, CourseStatus[]> = {
    DRAFT: ['PLANNED', 'ARCHIVED'],
    PLANNED: ['ACTIVE', 'ARCHIVED'],
    ACTIVE: ['COMPLETED', 'ARCHIVED'], // Cannot go back to Draft
    COMPLETED: ['ARCHIVED'],
    ARCHIVED: ['ACTIVE'], // Restore scenario (e.g., mistaken archiving)
  };

  /**
   * Evaluates if a transition is allowed.
   */
  static validateTransition(current: CourseStatus, next: CourseStatus): void {
    if (current === next) return;
    
    const allowed = this.TRANSITIONS[current] || [];
    if (!allowed.includes(next)) {
      throw new BusinessRuleException(
        `Invalid Course transition from ${current} to ${next}.`
      );
    }
  }
}
