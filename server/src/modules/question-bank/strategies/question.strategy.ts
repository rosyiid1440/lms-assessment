/**
 * Abstraction for Question Behavior and Grading Pipeline.
 * Eliminates giant if-else blocks for different question types.
 */
export interface AutoGradeResult {
  score: number; // 0 to maxScore
  isCorrect: boolean;
  feedback?: string; // Auto-generated feedback
}

export interface IQuestionStrategy {
  readonly type: string;
  
  /**
   * Validates the structure of the strategyPayload during question creation.
   */
  validatePayload(payload: any): void;
  
  /**
   * The Auto-Grading Engine.
   */
  evaluate(studentAnswer: any, correctAnswerPayload: any, maxScore: number): AutoGradeResult;
}

// ---------------------------------------------------------
// Implementations
// ---------------------------------------------------------

export class MultipleChoiceStrategy implements IQuestionStrategy {
  readonly type = 'MULTIPLE_CHOICE';

  validatePayload(payload: any): void {
    if (!payload.choices || !Array.isArray(payload.choices)) throw new Error('MCQ requires an array of choices');
    if (!payload.correctChoiceId) throw new Error('MCQ requires a correctChoiceId');
  }

  evaluate(studentAnswer: any, correctAnswerPayload: any, maxScore: number): AutoGradeResult {
    const isCorrect = studentAnswer === correctAnswerPayload.correctChoiceId;
    return {
      score: isCorrect ? maxScore : 0,
      isCorrect
    };
  }
}

export class NumericToleranceStrategy implements IQuestionStrategy {
  readonly type = 'NUMERIC';

  validatePayload(payload: any): void {
    if (typeof payload.exactAnswer !== 'number') throw new Error('Numeric requires an exactAnswer');
    if (typeof payload.tolerance !== 'number') throw new Error('Numeric requires a tolerance value');
  }

  evaluate(studentAnswer: any, correctAnswerPayload: any, maxScore: number): AutoGradeResult {
    const answer = parseFloat(studentAnswer);
    if (isNaN(answer)) return { score: 0, isCorrect: false };

    const min = correctAnswerPayload.exactAnswer - correctAnswerPayload.tolerance;
    const max = correctAnswerPayload.exactAnswer + correctAnswerPayload.tolerance;
    
    const isCorrect = answer >= min && answer <= max;
    return {
      score: isCorrect ? maxScore : 0,
      isCorrect
    };
  }
}
