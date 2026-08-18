import { z } from 'zod';

// ---------------------------------------------------------------------------
// SHARED PAGINATION / FILTER
// ---------------------------------------------------------------------------

export const PaginationSchema = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().default('updatedAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
};

// ---------------------------------------------------------------------------
// ENUM SETS (shared)
// ---------------------------------------------------------------------------

export const QUESTION_TYPES = [
  'MULTIPLE_CHOICE',
  'MULTIPLE_RESPONSE',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'ESSAY',
  'NUMERIC',
  'FILE_UPLOAD',
  'PROGRAMMING',
  'MATCHING',
  'ORDERING',
  'FILL_BLANK',
  'DATE',
  'CODE_SNIPPET',
  'CASE_STUDY',
  'READING_COMPREHENSION',
  'IMAGE_BASED',
  'AUDIO_BASED',
  'VIDEO_BASED',
  'HOTSPOT',
] as const;

export const QUESTION_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'HOTS'] as const;
export const BLOOM_LEVELS = ['C1_REMEMBERING', 'C2_UNDERSTANDING', 'C3_APPLYING', 'C4_ANALYZING', 'C5_EVALUATING', 'C6_CREATING'] as const;
export const QUESTION_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export const ASSESSMENT_STATUSES = ['DRAFT', 'SCHEDULED', 'READY', 'RUNNING', 'FINISHED', 'REVIEW', 'PUBLISHED', 'ARCHIVED'] as const;
export const POOL_SOURCES = ['MANUAL', 'QUESTION_BANK', 'RANDOM_CATEGORY', 'RANDOM_TAG', 'RANDOM_DIFFICULTY', 'RANDOM_LEARNING_OUTCOME', 'COMBINATION'] as const;
export const ASSESSMENT_VISIBILITIES = ['PRIVATE', 'PUBLIC', 'CLASS', 'COURSE'] as const;

// ---------------------------------------------------------------------------
// CATEGORY
// ---------------------------------------------------------------------------

export const CreateCategorySchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1, 'Nama kategori wajib').max(200),
  description: z.string().max(2000).nullable().optional(),
  orderIndex: z.number().int().min(0).default(0).optional(),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

export const CategoryQuerySchema = z.object({
  ...PaginationSchema,
  search: z.string().max(100).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

// ---------------------------------------------------------------------------
// TAG
// ---------------------------------------------------------------------------

export const CreateTagSchema = z.object({
  name: z.string().trim().min(1, 'Nama tag wajib').max(100),
  color: z.string().max(20).nullable().optional(),
});

export const UpdateTagSchema = CreateTagSchema.partial();

export const TagQuerySchema = z.object({
  ...PaginationSchema,
  search: z.string().max(100).optional(),
});

// ---------------------------------------------------------------------------
// QUESTION
// ---------------------------------------------------------------------------

const OptionSchema = z.object({
  key: z.string().min(1),
  label: z.string(),
  isCorrect: z.boolean().optional().default(false),
});

export const QuestionAnswerSchema = z.object({
  // Multiple choice / response
  keys: z.array(z.string()).optional(),
  // True/false
  boolean: z.boolean().nullable().optional(),
  // Short answer / fill blank
  text: z.string().nullable().optional(),
  variants: z.array(z.string()).optional(),
  // Numeric
  number: z.number().nullable().optional(),
  tolerance: z.number().min(0).optional(),
  // Date
  date: z.string().nullable().optional(),
  // Matching
  pairs: z.array(z.object({ left: z.string(), right: z.string() })).optional(),
  // Ordering
  sequence: z.array(z.string()).optional(),
});

export const CreateQuestionSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  subjectId: z.string().uuid().nullable().optional(),
  classId: z.string().uuid().nullable().optional(),
  semester: z.string().max(40).nullable().optional(),
  curriculum: z.string().max(60).nullable().optional(),
  competency: z.string().max(100).nullable().optional(),
  learningOutcome: z.string().max(200).nullable().optional(),
  topic: z.string().max(160).nullable().optional(),
  phase: z.string().max(10).nullable().optional(),
  type: z.enum(QUESTION_TYPES),
  difficulty: z.enum(QUESTION_DIFFICULTIES).default('MEDIUM'),
  bloomLevel: z.enum(BLOOM_LEVELS).default('C2_UNDERSTANDING'),
  status: z.enum(QUESTION_STATUSES).default('DRAFT'),
  prompt: z.string().min(1, 'Prompt/pertanyaan wajib').max(20000),
  explanation: z.string().max(10000).nullable().optional(),
  hint: z.string().max(2000).nullable().optional(),
  points: z.number().min(0).max(1000).default(1),
  negativeMarking: z.number().min(0).max(100).nullable().default(0),
  estimatedTime: z.number().int().min(5).max(7200).default(60),
  randomWeight: z.boolean().default(false),
  options: z.array(OptionSchema).max(100).nullable().optional(),
  answer: QuestionAnswerSchema.nullable().optional(),
  caseData: z.record(z.string(), z.any()).nullable().optional(),
  tagIds: z.array(z.string().uuid()).max(50).optional(),
});

export const UpdateQuestionSchema = CreateQuestionSchema.partial();

export const QuestionQuerySchema = z.object({
  ...PaginationSchema,
  search: z.string().max(100).optional(),
  type: z.enum(QUESTION_TYPES).optional(),
  difficulty: z.enum(QUESTION_DIFFICULTIES).optional(),
  bloomLevel: z.enum(BLOOM_LEVELS).optional(),
  status: z.enum(QUESTION_STATUSES).optional(),
  categoryId: z.string().uuid().optional(),
  tagId: z.string().uuid().optional(),
  topic: z.string().max(160).optional(),
  learningOutcome: z.string().max(200).optional(),
  subjectId: z.string().uuid().optional(),
  createdById: z.string().uuid().optional(),
  mine: z.enum(['true', 'false']).optional(),
});

export const QuestionIdParamSchema = z.object({ id: z.string().uuid() });

// ---------------------------------------------------------------------------
// ASSESSMENT
// ---------------------------------------------------------------------------

const AssessmentBaseSchema = z.object({
  title: z.string().trim().min(1, 'Judul wajib').max(255),
  description: z.string().max(4000).nullable().optional(),
  instructions: z.string().max(10000).nullable().optional(),
  status: z.enum(ASSESSMENT_STATUSES).default('DRAFT'),
  visibility: z.enum(ASSESSMENT_VISIBILITIES).default('CLASS'),
  courseId: z.string().uuid().nullable().optional(),
  classId: z.string().uuid().nullable().optional(),
  subjectId: z.string().uuid().nullable().optional(),
  openDate: z.coerce.date().nullable().optional(),
  closeDate: z.coerce.date().nullable().optional(),
  durationMinutes: z.number().int().min(1).max(1440).default(60),
  timezone: z.string().max(60).default('Asia/Jakarta'),
  attemptLimit: z.number().int().min(1).max(100).default(1),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  randomSelect: z.boolean().default(false),
  poolSource: z.enum(POOL_SOURCES).default('MANUAL'),
  passingScore: z.number().min(0).max(100).default(0),
  showResult: z.boolean().default(false),
  showCorrectAnswer: z.boolean().default(false),
  showExplanation: z.boolean().default(false),
  allowReview: z.boolean().default(true),
  allowResume: z.boolean().default(false),
  autoSubmit: z.boolean().default(true),
  lateSubmission: z.boolean().default(false),
  fullscreenMode: z.boolean().default(false),
  browserLock: z.boolean().default(false),
  showScoreByQuestion: z.boolean().default(false),
});

export const CreateAssessmentSchema = AssessmentBaseSchema.refine((d) => !d.openDate || !d.closeDate || d.openDate < d.closeDate, {
  message: 'openDate harus sebelum closeDate',
  path: ['closeDate'],
});

export const UpdateAssessmentSchema = AssessmentBaseSchema.partial();

export const AssessmentQuerySchema = z.object({
  ...PaginationSchema,
  search: z.string().max(100).optional(),
  status: z.enum(ASSESSMENT_STATUSES).optional(),
  classId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
});

export const AssessmentIdParamSchema = z.object({ id: z.string().uuid() });

// Assessment questions attach
export const AttachQuestionsSchema = z.object({
  questionIds: z.array(z.string().uuid()).min(1, 'Minimal 1 soal').max(500),
  points: z.number().min(0).max(1000).default(1).optional(),
  pointsMap: z.record(z.string().uuid(), z.number().min(0).max(1000)).optional(),
});

export const SetQuestionPointsSchema = z.object({
  points: z.number().min(0).max(1000),
});

export const BalancePointsSchema = z.object({
  totalPoints: z.number().min(1).max(100000).default(100).optional(),
});

export const RemoveQuestionParamSchema = z.object({
  assessmentId: z.string().uuid(),
  questionId: z.string().uuid(),
});

// Pool rule
export const CreatePoolRuleSchema = z.object({
  poolSource: z.enum(POOL_SOURCES),
  categoryId: z.string().uuid().nullable().optional(),
  tagId: z.string().uuid().nullable().optional(),
  difficulty: z.enum(QUESTION_DIFFICULTIES).nullable().optional(),
  bloomLevel: z.enum(BLOOM_LEVELS).nullable().optional(),
  learningOutcome: z.string().max(200).nullable().optional(),
  topic: z.string().max(160).nullable().optional(),
  count: z.number().int().min(1).max(200).default(1),
  orderIndex: z.number().int().min(0).default(0).optional(),
});

export const CreatePoolRuleParamSchema = z.object({ id: z.string().uuid() });
export const PoolRuleIdParamSchema = z.object({ id: z.string().uuid(), ruleId: z.string().uuid() });

// Publish
export const PublishAssessmentSchema = z.object({
  id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// ATTEMPT (STUDENT)
// ---------------------------------------------------------------------------

export const AttemptParamSchema = z.object({ id: z.string().uuid() });

export const StartAttemptSchema = z.object({
  id: z.string().uuid(),
});

export const SaveAnswerSchema = z.object({
  response: z.any().nullable(),
  flagged: z.boolean().optional(),
  visited: z.boolean().optional(),
  timeSpentSeconds: z.number().int().min(0).optional(),
});

export const SaveAnswerParamSchema = z.object({
  attemptId: z.string().uuid(),
  questionRefId: z.string().uuid(),
});

export const SubmitAttemptSchema = z.object({
  id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// REVIEW / GRADING (TEACHER)
// ---------------------------------------------------------------------------

export const ReviewQuerySchema = z.object({
  ...PaginationSchema,
  attemptId: z.string().uuid().optional(),
  questionId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'COMPLETED']).optional(),
});

export const GradeAnswerSchema = z.object({
  score: z.number().min(0).max(1000),
  feedback: z.string().max(4000).nullable().optional(),
  comment: z.string().max(4000).nullable().optional(),
  privateNote: z.string().max(4000).nullable().optional(),
  regradeReason: z.enum(['SYSTEM', 'MANUAL', 'APPEAL', 'OVERRIDE', 'CORRECTION']).default('MANUAL'),
  overrideReason: z.string().max(255).nullable().optional(),
});

export const GradeAnswerParamSchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
});

export const GradeAttemptParamSchema = z.object({ id: z.string().uuid() });
