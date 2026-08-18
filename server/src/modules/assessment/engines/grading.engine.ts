import type { Prisma } from '@prisma/client';

export interface GradeInput {
  questionType: string;
  response: Prisma.JsonValue | null;
  answer: Prisma.JsonValue | null;
  options?: Prisma.JsonValue | null;
}

export interface GradeOutput {
  isCorrect: boolean;
  points: number;
  correctAnswer: Prisma.JsonValue | null;
}

/**
 * Auto-grading engine. Handles objective question types.
 * Subjective types (ESSAY, FILE_UPLOAD, PROGRAMMING, CODE_SNIPPET, HOTSPOT)
 * are routed to manual review by the caller.
 */
export class GradingEngine {
  private static normalizeText(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private static isAutoGradeable(type: string): boolean {
    return ['MULTIPLE_CHOICE', 'MULTIPLE_RESPONSE', 'TRUE_FALSE', 'SHORT_ANSWER', 'NUMERIC', 'MATCHING', 'ORDERING', 'FILL_BLANK', 'DATE'].includes(type);
  }

  private static gradeMultipleChoice(response: unknown, answer: unknown, options: unknown): boolean {
    const keys = Array.isArray(answer) ? answer : (answer as any)?.keys;
    if (!Array.isArray(keys) || keys.length === 0) return false;
    const selected = Array.isArray(response) ? response : (response as any)?.keys;
    if (!Array.isArray(selected) || selected.length === 0) return false;
    if (selected.length !== keys.length) return false;
    return keys.every((k) => selected.includes(k)) && selected.every((s) => keys.includes(s));
  }

  private static gradeMultipleResponse(response: unknown, answer: unknown): boolean {
    const keys = Array.isArray(answer) ? answer : (answer as any)?.keys;
    if (!Array.isArray(keys) || keys.length === 0) return false;
    const selected = Array.isArray(response) ? response : (response as any)?.keys;
    if (!Array.isArray(selected)) return false;
    if (selected.length !== keys.length) return false;
    return keys.every((k) => selected.includes(k)) && selected.every((s) => keys.includes(s));
  }

  private static gradeTrueFalse(response: unknown, answer: unknown): boolean {
    const expected = (answer as any)?.boolean ?? answer;
    if (typeof expected !== 'boolean') return false;
    const actual = (response as any)?.boolean ?? response;
    if (typeof actual !== 'boolean') return false;
    return actual === expected;
  }

  private static gradeShortAnswer(response: unknown, answer: unknown): boolean {
    const expected = (answer as any)?.text ?? '';
    const variants = ((answer as any)?.variants ?? []).map((v: string) => this.normalizeText(v));
    const actual = this.normalizeText((response as any)?.text ?? response);
    if (!actual) return false;
    const primary = this.normalizeText(expected);
    return actual === primary || variants.includes(actual);
  }

  private static gradeNumeric(response: unknown, answer: unknown): boolean {
    const expected = Number((answer as any)?.number ?? answer);
    const tolerance = Number((answer as any)?.tolerance ?? 0);
    if (Number.isNaN(expected)) return false;
    const actual = Number((response as any)?.number ?? response);
    if (Number.isNaN(actual)) return false;
    return Math.abs(actual - expected) <= tolerance;
  }

  private static gradeDate(response: unknown, answer: unknown): boolean {
    const expected = String((answer as any)?.date ?? '');
    const actual = String((response as any)?.date ?? response);
    if (!expected || !actual) return false;
    try {
      return new Date(expected).getTime() === new Date(actual).getTime();
    } catch {
      return false;
    }
  }

  private static gradeMatching(response: unknown, answer: unknown): boolean {
    const pairs = (answer as any)?.pairs ?? [];
    const actual = (response as any)?.pairs ?? [];
    if (!Array.isArray(pairs) || pairs.length === 0 || !Array.isArray(actual) || actual.length === 0) return false;
    const map = new Map(pairs.map((p: any) => [this.normalizeText(p.left), this.normalizeText(p.right)]));
    return actual.every((a: any) => map.get(this.normalizeText(a.left)) === this.normalizeText(a.right));
  }

  private static gradeOrdering(response: unknown, answer: unknown): boolean {
    const expected = (answer as any)?.sequence ?? [];
    const actual = (response as any)?.sequence ?? [];
    if (!Array.isArray(expected) || expected.length === 0) return false;
    if (actual.length !== expected.length) return false;
    return expected.every((e: string, i: number) => this.normalizeText(actual[i]) === this.normalizeText(e));
  }

  private static gradeFillBlank(response: unknown, answer: unknown): boolean {
    const blanks = (answer as any)?.text ?? (answer as any)?.keys ?? [];
    const actual = (response as any)?.text ?? response;
    if (typeof actual !== 'string' || !actual.trim()) return false;
    const provided = actual.trim().toLowerCase().split(',').map((s: string) => s.trim());
    if (Array.isArray(blanks)) {
      if (provided.length !== blanks.length) return false;
      return blanks.every((b: string, i: number) => this.normalizeText(b) === provided[i]);
    }
    return this.normalizeText(blanks) === this.normalizeText(actual);
  }

  static grade(input: GradeInput): GradeOutput {
    const { questionType, response, answer } = input;
    let isCorrect = false;

    switch (questionType) {
      case 'MULTIPLE_CHOICE':
        isCorrect = this.gradeMultipleChoice(response, answer, input.options);
        break;
      case 'MULTIPLE_RESPONSE':
        isCorrect = this.gradeMultipleResponse(response, answer);
        break;
      case 'TRUE_FALSE':
        isCorrect = this.gradeTrueFalse(response, answer);
        break;
      case 'SHORT_ANSWER':
        isCorrect = this.gradeShortAnswer(response, answer);
        break;
      case 'NUMERIC':
        isCorrect = this.gradeNumeric(response, answer);
        break;
      case 'DATE':
        isCorrect = this.gradeDate(response, answer);
        break;
      case 'MATCHING':
        isCorrect = this.gradeMatching(response, answer);
        break;
      case 'ORDERING':
        isCorrect = this.gradeOrdering(response, answer);
        break;
      case 'FILL_BLANK':
        isCorrect = this.gradeFillBlank(response, answer);
        break;
      default:
        // Subjective — cannot auto-grade
        return { isCorrect: false, points: 0, correctAnswer: null };
    }

    return { isCorrect, points: isCorrect ? 1 : 0, correctAnswer: answer };
  }

  static requiresManualGrading(questionType: string): boolean {
    return !this.isAutoGradeable(questionType);
  }
}
