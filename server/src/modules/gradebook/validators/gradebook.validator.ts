import { z } from 'zod';

export const LedgerSourceTypeSchema = z.enum(['ASSIGNMENT', 'EXAM', 'PROJECT_P5', 'OBSERVATION', 'ATTENDANCE']);
export const LedgerEntryTypeSchema = z.enum(['INITIAL_ENTRY', 'CORRECTION', 'REMEDIAL', 'PENALTY']);
export const ReportCardStatusSchema = z.enum(['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED']);
export const FormulaCalculationTypeSchema = z.enum(['WEIGHTED_AVERAGE', 'BEST_OF', 'SUM']);

export const CourseParamSchema = z.object({
  courseId: z.string().uuid(),
});

export const ReportCardParamSchema = z.object({
  id: z.string().uuid(),
});

export const CreateLedgerEntrySchema = z.object({
  studentId: z.string().uuid(),
  courseId: z.string().uuid(),
  sourceType: LedgerSourceTypeSchema,
  referenceId: z.string().uuid(),
  referenceVersion: z.number().int().min(1).default(1),
  cpId: z.string().max(100).optional(),
  tpId: z.string().max(100).optional(),
  entryType: LedgerEntryTypeSchema,
  scoreChange: z.number().min(-100).max(100),
  weight: z.number().min(0.1).max(100).default(1),
  reason: z.string().min(1).max(500),
});

export const LedgerQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  sourceType: LedgerSourceTypeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const FormulaComponentSchema = z.object({
  sourceType: LedgerSourceTypeSchema,
  weightPercentage: z.number().min(0).max(100),
  dropLowest: z.boolean().default(false),
});

export const UpsertFormulaSchema = z.object({
  courseId: z.string().uuid(),
  calculationType: FormulaCalculationTypeSchema,
  passingScore: z.number().min(0).max(100).default(75),
  components: z.array(FormulaComponentSchema).max(10),
});

export const BuildReportCardSchema = z.object({
  studentId: z.string().uuid(),
  semesterId: z.string().uuid(),
  homeroomTeacherNote: z.string().max(1000).optional(),
});

export const ReportCardQuerySchema = z.object({
  semesterId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  status: ReportCardStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const TransitionSchema = z.object({
  nextStatus: ReportCardStatusSchema,
  notes: z.string().max(1000).optional(),
  expectedVersion: z.number().int().min(1),
});
