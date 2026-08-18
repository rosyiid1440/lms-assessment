import type { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// SHARED
// ---------------------------------------------------------------------------

export interface PaginationRequest {
  page: number;
  limit: number;
}

export interface SortRequest {
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AssessmentActor {
  userId: string;
  tenantId: string;
  roleSlug: string;
  teacherId?: string | null;
  studentId?: string | null;
}

// ---------------------------------------------------------------------------
// QUESTION CATEGORY
// ---------------------------------------------------------------------------

export interface QuestionCategorySummary {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  orderIndex: number;
  questionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// QUESTION TAG
// ---------------------------------------------------------------------------

export interface QuestionTagSummary {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  questionCount: number;
}

// ---------------------------------------------------------------------------
// QUESTION
// ---------------------------------------------------------------------------

export interface QuestionDTO {
  id: string;
  version: number;
  type: string;
  difficulty: string;
  bloomLevel: string;
  status: string;
  prompt: string;
  explanation: string | null;
  hint: string | null;
  categoryId: string | null;
  categoryName: string | null;
  subjectId: string | null;
  classId: string | null;
  semester: string | null;
  curriculum: string | null;
  competency: string | null;
  learningOutcome: string | null;
  topic: string | null;
  phase: string | null;
  points: number;
  negativeMarking: number | null;
  estimatedTime: number;
  randomWeight: boolean;
  options: Prisma.JsonValue | null;
  answer: Prisma.JsonValue | null;
  caseData: Prisma.JsonValue | null;
  usageCount: number;
  tags: QuestionTagSummary[];
  versionNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionCreateDTO {
  tenantId: string;
  categoryId?: string | null;
  subjectId?: string | null;
  classId?: string | null;
  semester?: string | null;
  curriculum?: string | null;
  competency?: string | null;
  learningOutcome?: string | null;
  topic?: string | null;
  phase?: string | null;
  type: string;
  difficulty: string;
  bloomLevel: string;
  status?: string;
  prompt: string;
  explanation?: string | null;
  hint?: string | null;
  points?: number;
  negativeMarking?: number | null;
  estimatedTime?: number;
  randomWeight?: boolean;
  options?: Prisma.JsonValue | null;
  answer?: Prisma.JsonValue | null;
  caseData?: Prisma.JsonValue | null;
  tagIds?: string[];
  createdById?: string | null;
}

export interface QuestionUpdateDTO {
  tenantId: string;
  questionId: string;
  categoryId?: string | null;
  subjectId?: string | null;
  classId?: string | null;
  semester?: string | null;
  curriculum?: string | null;
  competency?: string | null;
  learningOutcome?: string | null;
  topic?: string | null;
  phase?: string | null;
  type?: string;
  difficulty?: string;
  bloomLevel?: string;
  status?: string;
  prompt?: string;
  explanation?: string | null;
  hint?: string | null;
  points?: number;
  negativeMarking?: number | null;
  estimatedTime?: number;
  randomWeight?: boolean;
  options?: Prisma.JsonValue | null;
  answer?: Prisma.JsonValue | null;
  caseData?: Prisma.JsonValue | null;
  tagIds?: string[];
  updatedById?: string | null;
}

export interface QuestionVersionDTO {
  id: string;
  versionNumber: number;
  snapshot: Prisma.JsonValue;
  createdAt: Date;
  createdById: string | null;
}

// ---------------------------------------------------------------------------
// ASSESSMENT
// ---------------------------------------------------------------------------

export interface AssessmentSummary {
  id: string;
  title: string;
  description: string | null;
  status: string;
  classId: string | null;
  courseId: string | null;
  subjectId: string | null;
  openDate: Date | null;
  closeDate: Date | null;
  durationMinutes: number;
  attemptLimit: number;
  maxPoints: number;
  questionCount: number;
  attemptCount: number;
  submittedCount: number;
  passingScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssessmentDTO extends AssessmentSummary {
  instructions: string | null;
  timezone: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  randomSelect: boolean;
  poolSource: string;
  showResult: boolean;
  showCorrectAnswer: boolean;
  showExplanation: boolean;
  allowReview: boolean;
  allowResume: boolean;
  autoSubmit: boolean;
  lateSubmission: boolean;
  fullscreenMode: boolean;
  browserLock: boolean;
  showScoreByQuestion: boolean;
  visibility: string;
  teacherId: string | null;
  questions: Array<{
    id: string;
    orderIndex: number;
    points: number;
    question: QuestionDTO;
  }>;
  poolRules: Array<{
    id: string;
    poolSource: string;
    categoryId: string | null;
    tagId: string | null;
    difficulty: string | null;
    bloomLevel: string | null;
    learningOutcome: string | null;
    topic: string | null;
    count: number;
  }>;
}

export interface AssessmentCreateDTO {
  tenantId: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  status?: string;
  visibility?: string;
  courseId?: string | null;
  classId?: string | null;
  subjectId?: string | null;
  teacherId?: string | null;
  openDate?: Date | null;
  closeDate?: Date | null;
  durationMinutes?: number;
  timezone?: string;
  attemptLimit?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  randomSelect?: boolean;
  poolSource?: string;
  passingScore?: number;
  showResult?: boolean;
  showCorrectAnswer?: boolean;
  showExplanation?: boolean;
  allowReview?: boolean;
  allowResume?: boolean;
  autoSubmit?: boolean;
  lateSubmission?: boolean;
  fullscreenMode?: boolean;
  browserLock?: boolean;
  showScoreByQuestion?: boolean;
  createdById?: string | null;
}

// ---------------------------------------------------------------------------
// ATTEMPT
// ---------------------------------------------------------------------------

export interface AttemptQuestion {
  refId: string;
  questionId: string;
  orderIndex: number;
  points: number;
  type: string;
  prompt: string;
  options: Prisma.JsonValue | null;
  caseData: Prisma.JsonValue | null;
  difficulty: string;
  bloomLevel: string;
  matchChoices?: string[] | null;
  orderItems?: string[] | null;
  timeSpentSeconds: number;
  flagged: boolean;
  visited: boolean;
  status: string;
  response: Prisma.JsonValue | null;
}

export interface AttemptDTO {
  id: string;
  assessmentId: string;
  studentId: string;
  attemptNumber: number;
  status: string;
  startedAt: Date;
  expectedEndTime: Date;
  submittedAt: Date | null;
  resumedAt: Date | null;
  timeSpentSeconds: number;
  score: number | null;
  rawScore: number | null;
  totalPoints: number | null;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  tabSwitches: number;
  fullscreenExits: number;
  networkDisconnects: number;
  proctoringStatus: string;
  questions: AttemptQuestion[];
  totalSecondsLeft: number;
}

// ---------------------------------------------------------------------------
// RESULT
// ---------------------------------------------------------------------------

export interface ResultDTO {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  attemptId: string;
  studentId: string;
  studentName: string;
  nis: string | null;
  rawScore: number;
  totalPoints: number;
  percentage: number;
  grade: string | null;
  passed: boolean;
  rank: number | null;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  timeSpentSeconds: number;
  submittedAt: Date | null;
}

// ---------------------------------------------------------------------------
// ANALYTICS
// ---------------------------------------------------------------------------

export interface AnalyticsDTO {
  assessmentId: string;
  assessmentTitle: string;
  participantCount: number;
  submittedCount: number;
  notSubmittedCount: number;
  averageScore: number;
  medianScore: number;
  highestScore: number;
  lowestScore: number;
  stdDeviation: number;
  passRate: number;
  scoreHistogram: Prisma.JsonValue | null;
  questionStats: Prisma.JsonValue | null;
  timeDistribution: Prisma.JsonValue | null;
  difficultyIndex: Prisma.JsonValue | null;
  discrimination: Prisma.JsonValue | null;
  computedAt: Date;
}
