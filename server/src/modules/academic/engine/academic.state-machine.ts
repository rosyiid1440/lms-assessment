import { AcademicYearStatus, SemesterStatus } from '../dtos/academic.dto';
import { BusinessRuleException } from '../../../core/exceptions/app.exception';

/**
 * Strict Rule Engine for Academic Lifecycles
 */
export class AcademicStateMachine {
  
  // ACADEMIC YEAR: DRAFT -> ACTIVE -> CLOSED -> ARCHIVED
  private static readonly YEAR_TRANSITIONS: Record<AcademicYearStatus, AcademicYearStatus[]> = {
    DRAFT: ['ACTIVE', 'ARCHIVED'],
    ACTIVE: ['CLOSED'], 
    CLOSED: ['ARCHIVED'],
    ARCHIVED: [], // Terminal state
  };

  // SEMESTER: DRAFT -> PLANNING -> RUNNING -> GRADING -> CLOSED -> ARCHIVED
  private static readonly SEMESTER_TRANSITIONS: Record<SemesterStatus, SemesterStatus[]> = {
    DRAFT: ['PLANNING', 'ARCHIVED'],
    PLANNING: ['RUNNING', 'ARCHIVED'],
    RUNNING: ['GRADING', 'CLOSED'], // Can jump to closed if grading isn't rigidly enforced by system
    GRADING: ['CLOSED'],
    CLOSED: ['ARCHIVED'],
    ARCHIVED: [], // Terminal state
  };

  static validateYearTransition(current: AcademicYearStatus, next: AcademicYearStatus): void {
    if (current === next) return;
    
    const allowed = this.YEAR_TRANSITIONS[current] || [];
    if (!allowed.includes(next)) {
      throw new BusinessRuleException(`Cannot transition Academic Year from ${current} to ${next}`);
    }
  }

  static validateSemesterTransition(current: SemesterStatus, next: SemesterStatus): void {
    if (current === next) return;
    
    const allowed = this.SEMESTER_TRANSITIONS[current] || [];
    if (!allowed.includes(next)) {
      throw new BusinessRuleException(`Cannot transition Semester from ${current} to ${next}`);
    }
  }
}
