/**
 * Defines how multiple grades are combined into a final score.
 */
export interface IGradeFormulaStrategy {
  calculate(grades: { score: number; weight?: number; type?: string }[]): number;
}

export class WeightedFormulaStrategy implements IGradeFormulaStrategy {
  calculate(grades: { score: number; weight?: number }[]): number {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const g of grades) {
      const weight = g.weight || 1; // default weight 1 if not specified
      weightedSum += g.score * weight;
      totalWeight += weight;
    }

    return totalWeight === 0 ? 0 : Math.round(weightedSum / totalWeight);
  }
}

export class BestOfFormulaStrategy implements IGradeFormulaStrategy {
  constructor(private readonly takeTop: number) {}

  calculate(grades: { score: number }[]): number {
    if (grades.length === 0) return 0;

    // Sort descending
    const sorted = [...grades].sort((a, b) => b.score - a.score);
    const topGrades = sorted.slice(0, this.takeTop);

    const sum = topGrades.reduce((acc, curr) => acc + curr.score, 0);
    return Math.round(sum / topGrades.length);
  }
}

export class SumFormulaStrategy implements IGradeFormulaStrategy {
  calculate(grades: { score: number }[]): number {
    return grades.reduce((acc, curr) => acc + curr.score, 0);
  }
}

/**
 * Strategy for how Remedial grades affect the original grade
 */
export class RemedialStrategy {
  static replace(original: number, remedial: number): number {
    return remedial;
  }

  static highest(original: number, remedial: number): number {
    return Math.max(original, remedial);
  }

  static average(original: number, remedial: number): number {
    return Math.round((original + remedial) / 2);
  }
}

// ------------------------------------------------------------------
// LETTER GRADE MAPPING (Indonesian standard)
// ------------------------------------------------------------------
export function toLetterGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 50) return 'D';
  return 'E';
}

export function masteryLevelOf(score: number): string {
  if (score >= 90) return 'EXCEEDS';
  if (score >= 80) return 'PROFICIENT';
  if (score >= 70) return 'APPROACHING';
  if (score >= 60) return 'NEEDS_INTERVENTION';
  return 'NOT_EVALUATED';
}

// ------------------------------------------------------------------
// PROJECTION COMPUTATION (drives the read model)
// ------------------------------------------------------------------
export interface LedgerEntryForProjection {
  referenceId: string;
  sourceType: string;
  entryType: string;
  scoreChange: number;
  weight: number;
  tpId?: string | null;
}

export interface ProjectionConfig {
  calculationType: 'WEIGHTED_AVERAGE' | 'BEST_OF' | 'SUM';
  passingScore: number;
  components: { sourceType: string; weightPercentage: number; dropLowest: boolean }[];
}

const DEFAULT_COMPONENTS = [
  { sourceType: 'ASSIGNMENT', weightPercentage: 50, dropLowest: false },
  { sourceType: 'EXAM', weightPercentage: 50, dropLowest: false },
];

/**
 * Computes the final score from an immutable ledger of entries.
 *
 * Rules:
 *  - Entries are grouped by reference (assignment/exam) then by source type.
 *  - INITIAL_ENTRY seeds a reference's absolute score; CORRECTION/PENALTY are
 *    deltas applied to that same reference; REMEDIAL replaces (highest wins).
 *  - Per source type, references are averaged (optionally dropping lowest).
 *  - Components weight how much each source type contributes to the final grade.
 */
export function computeFinalScore(
  entries: LedgerEntryForProjection[],
  config: ProjectionConfig,
): { finalScore: number; letterGrade: string; isPassed: boolean } {
  if (entries.length === 0) {
    return { finalScore: 0, letterGrade: 'E', isPassed: false };
  }

  const byReference = new Map<string, Map<string, { raw: number; remedial: number | null }>>();
  for (const e of entries) {
    if (!byReference.has(e.referenceId)) byReference.set(e.referenceId, new Map());
    const refMap = byReference.get(e.referenceId)!;
    const cur = refMap.get(e.sourceType) ?? { raw: 0, remedial: null };
    switch (e.entryType) {
      case 'INITIAL_ENTRY':
        cur.raw = e.scoreChange;
        break;
      case 'REMEDIAL':
        cur.remedial = e.scoreChange;
        break;
      case 'PENALTY':
        cur.raw -= Math.abs(e.scoreChange);
        break;
      case 'CORRECTION':
      default:
        cur.raw += e.scoreChange;
        break;
    }
    refMap.set(e.sourceType, cur);
  }

  // Aggregate reference scores per source type
  const perSource = new Map<string, number[]>();
  for (const refMap of byReference.values()) {
    for (const [sourceType, val] of refMap.entries()) {
      const score = val.remedial !== null ? Math.max(val.raw, val.remedial) : val.raw;
      if (!perSource.has(sourceType)) perSource.set(sourceType, []);
      perSource.get(sourceType)!.push(Math.max(0, Math.min(100, score)));
    }
  }

  const components = config.components.length > 0 ? config.components : DEFAULT_COMPONENTS;

  if (config.calculationType === 'BEST_OF') {
    const allScores: number[] = [];
    for (const scores of perSource.values()) allScores.push(...scores);
    const strategy = new BestOfFormulaStrategy(components.length);
    const finalScore = strategy.calculate(allScores.map((score) => ({ score })));
    const letterGrade = toLetterGrade(finalScore);
    return { finalScore, letterGrade, isPassed: finalScore >= config.passingScore };
  }

  if (config.calculationType === 'SUM') {
    const allScores: number[] = [];
    for (const scores of perSource.values()) allScores.push(...scores);
    const strategy = new SumFormulaStrategy();
    const finalScore = Math.round(strategy.calculate(allScores.map((score) => ({ score }))) / allScores.length);
    const letterGrade = toLetterGrade(finalScore);
    return { finalScore, letterGrade, isPassed: finalScore >= config.passingScore };
  }

  // WEIGHTED_AVERAGE (default)
  const weights: { score: number; weight: number }[] = [];
  for (const comp of components) {
    const scores = perSource.get(comp.sourceType);
    if (!scores || scores.length === 0) continue;
    const sorted = [...scores].sort((a, b) => a - b);
    const effective = comp.dropLowest && sorted.length > 1 ? sorted.slice(1) : sorted;
    const avg = effective.reduce((a, b) => a + b, 0) / effective.length;
    weights.push({ score: avg, weight: comp.weightPercentage });
  }

  const strategy = new WeightedFormulaStrategy();
  const finalScore = strategy.calculate(weights);
  const letterGrade = toLetterGrade(finalScore);
  return { finalScore, letterGrade, isPassed: finalScore >= config.passingScore };
}
