export type ExamStatus = 'DRAFT' | 'SCHEDULED' | 'READY' | 'RUNNING' | 'FINISHED' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';

export interface CreateExamDTO {
  tenantId: string;
  courseId: string; // The central hub linking Subject & Class
  title: string;
  instruction: string;
  
  // Timing Policies
  scheduledStart: Date;
  scheduledEnd: Date;
  durationMinutes: number;
  
  // Randomization Engine config
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  
  // Grading & Review config
  autoPublishResult: boolean;
  showCorrectAnswers: boolean;
}

// ---------------------------------------------------------
// ATTEMPT AGGREGATE (Fault Tolerant Sync & Proctoring)
// ---------------------------------------------------------
export type AttemptStatus = 'IN_PROGRESS' | 'AUTO_SUBMITTED' | 'MANUAL_SUBMITTED' | 'EVALUATING' | 'COMPLETED' | 'ABANDONED';

export interface ProctoringMetadata {
  fullscreenExits: number;
  tabSwitches: number;
  copyPastes: number;
  networkDisconnects: number;
  lastIpAddress: string;
  deviceFingerprint: string;
}

export interface SyncAnswerPayload {
  questionId: string;
  answerPayload: any;
  clientTimestamp: number; // For out-of-order resolution
}

export interface ExamAttemptDTO {
  id: string;
  examId: string;
  studentId: string;
  status: AttemptStatus;
  
  startedAt: Date;
  expectedEndTime: Date; // Calculated at start time for Authoritative Timer
  submittedAt?: Date;
  
  // Analytics
  timeSpentSeconds: number;
  score: number;
  
  proctoring: ProctoringMetadata;
  version: number; // OCC for Sync Queue
}
