import { AssignmentStatus } from '../dtos/assignment.dto';
import { BusinessRuleException } from '../../../core/exceptions/app.exception';

export class AssignmentStateMachine {
  private static readonly TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
    DRAFT: ['SCHEDULED', 'OPEN', 'ARCHIVED'],
    SCHEDULED: ['OPEN', 'DRAFT', 'ARCHIVED'],
    OPEN: ['CLOSED', 'ARCHIVED'], // Closes automatically or manually
    CLOSED: ['GRADING', 'OPEN', 'ARCHIVED'], // Re-open allowed for extensions
    GRADING: ['PUBLISHED', 'CLOSED'], // Publish grades to students
    PUBLISHED: ['ARCHIVED'],
    ARCHIVED: ['DRAFT'], // Complete reset to duplicate/reuse
  };

  static validateTransition(current: AssignmentStatus, next: AssignmentStatus): void {
    if (current === next) return;
    
    const allowed = this.TRANSITIONS[current] || [];
    if (!allowed.includes(next)) {
      throw new BusinessRuleException(
        `Invalid Assignment transition from ${current} to ${next}.`
      );
    }
  }
}
