import { ReportCardStatus } from '../dtos/gradebook.dto';
import { BusinessRuleException } from '../../../core/exceptions/app.exception';

export class ApprovalWorkflowStateMachine {
  private static readonly TRANSITIONS: Record<ReportCardStatus, ReportCardStatus[]> = {
    DRAFT: ['UNDER_REVIEW'],
    UNDER_REVIEW: ['APPROVED', 'DRAFT'], // DRAFT = rejected, sent back to homeroom teacher
    APPROVED: ['PUBLISHED'],
    PUBLISHED: ['ARCHIVED'],
    ARCHIVED: [],
  };

  static validateTransition(current: ReportCardStatus, next: ReportCardStatus): void {
    if (current === next) return;

    const allowed = this.TRANSITIONS[current] || [];
    if (!allowed.includes(next)) {
      throw new BusinessRuleException(
        `Invalid Report Card approval transition from ${current} to ${next}.`
      );
    }
  }

  static get allowedNext(): Record<ReportCardStatus, ReportCardStatus[]> {
    return this.TRANSITIONS;
  }
}
