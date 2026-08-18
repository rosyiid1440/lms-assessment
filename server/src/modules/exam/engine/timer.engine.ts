import { ExamStatus, AttemptStatus, ExamAttemptDTO } from '../dtos/exam.dto';
import { BusinessRuleException } from '../../../core/exceptions/app.exception';

export class ExamStateMachine {
  private static readonly EXAM_TRANSITIONS: Record<ExamStatus, ExamStatus[]> = {
    DRAFT: ['SCHEDULED', 'READY', 'ARCHIVED'],
    SCHEDULED: ['READY', 'DRAFT', 'ARCHIVED'],
    READY: ['RUNNING', 'DRAFT', 'ARCHIVED'],
    RUNNING: ['FINISHED'], // Cannot edit exam while running
    FINISHED: ['REVIEW', 'PUBLISHED'],
    REVIEW: ['PUBLISHED'],
    PUBLISHED: ['ARCHIVED'],
    ARCHIVED: ['DRAFT']
  };

  static validateExamTransition(current: ExamStatus, next: ExamStatus): void {
    if (current === next) return;
    if (!(this.EXAM_TRANSITIONS[current] || []).includes(next)) {
      throw new BusinessRuleException(`Cannot transition Exam from ${current} to ${next}.`);
    }
  }

  static validateAttemptStateForSync(status: AttemptStatus): void {
    if (status !== 'IN_PROGRESS') {
      throw new BusinessRuleException(`Cannot save answers. Attempt is already ${status}.`);
    }
  }
}

/**
 * Authoritative Server Timer.
 * Prevents client-side clock manipulation.
 */
export class ExamTimerEngine {
  /**
   * Checks if an attempt has expired based on server time.
   */
  static isExpired(attempt: ExamAttemptDTO, bufferSeconds: number = 30): boolean {
    const now = new Date();
    // Allow a small grace period (bufferSeconds) for network latency during the final submission
    const expirationWithBuffer = new Date(attempt.expectedEndTime.getTime() + (bufferSeconds * 1000));
    
    return now > expirationWithBuffer;
  }

  /**
   * Calculates actual time spent (server authoritative).
   */
  static calculateTimeSpentSeconds(attempt: ExamAttemptDTO): number {
    const end = attempt.submittedAt || new Date();
    // Cap the time spent to the expected end time if they went over somehow
    const validEnd = end > attempt.expectedEndTime ? attempt.expectedEndTime : end;
    
    return Math.floor((validEnd.getTime() - attempt.startedAt.getTime()) / 1000);
  }
}
