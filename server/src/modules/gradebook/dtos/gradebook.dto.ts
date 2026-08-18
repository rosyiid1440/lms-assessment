// ---------------------------------------------------------
// GRADEBOOK DOMAIN DTOs (aligned with Prisma enums)
// ---------------------------------------------------------

// --- Ledger ---
export type LedgerEntryType = 'INITIAL_ENTRY' | 'CORRECTION' | 'REMEDIAL' | 'PENALTY';
export type GradeSourceType = 'ASSIGNMENT' | 'EXAM' | 'PROJECT_P5' | 'OBSERVATION' | 'ATTENDANCE';

export interface CreateLedgerEntryDTO {
  tenantId: string;
  studentId: string;
  courseId: string;
  semesterId: string;
  sourceType: GradeSourceType;
  referenceId: string; // e.g., AssignmentId / AssessmentId
  referenceVersion: number;

  cpId?: string;
  tpId?: string;

  entryType: LedgerEntryType;
  scoreChange: number;
  weight: number;
  reason: string;
  recordedById: string;
}

// --- Formula ---
export type FormulaCalculationType = 'WEIGHTED_AVERAGE' | 'BEST_OF' | 'SUM';

export interface GradeFormulaComponentDTO {
  sourceType: GradeSourceType;
  weightPercentage: number;
  dropLowest: boolean;
}

export interface GradeFormulaDTO {
  courseId: string;
  calculationType: FormulaCalculationType;
  passingScore: number;
  components: GradeFormulaComponentDTO[];
}

// --- Projection ---
export interface GradeProjectionDTO {
  studentId: string;
  courseId: string;
  semesterId: string;
  finalScore: number;
  letterGrade: string;
  isPassed: boolean;
  lastLedgerId: string;
}

export interface CompetencySummaryDTO {
  studentId: string;
  courseId: string;
  tpId: string;
  masteryScore: number;
  masteryLevel: MasteryLevel;
  needsRemedial: boolean;
}

export type MasteryLevel = 'NOT_EVALUATED' | 'NEEDS_INTERVENTION' | 'APPROACHING' | 'PROFICIENT' | 'EXCEEDS';

// --- Report Card / Approval ---
export type ReportCardStatus = 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';

export interface WorkflowTransitionDTO {
  tenantId: string;
  reportCardId: string;
  nextStatus: ReportCardStatus;
  notes?: string;
  expectedVersion: number;
}

export interface ReportCardItemDTO {
  courseId: string;
  subjectName: string;
  teacherName: string;
  finalScore: number;
  letterGrade: string;
  highestCompetencyDesc: string;
  lowestCompetencyDesc: string;
}

export interface BuildReportCardDTO {
  tenantId: string;
  studentId: string;
  semesterId: string;
  homeroomTeacherNote?: string;
}

// --- Dashboard ---
export interface CompetencyHeatmapDTO {
  tpId: string;
  tpName: string;
  averageScore: number;
  completionRate: number;
}

export interface StudentGradeDashboardDTO {
  studentId: string;
  courseName: string;
  currentScore: number;
  competencyBreakdown: {
    tpName: string;
    score: number;
    isPassed: boolean;
  }[];
}
