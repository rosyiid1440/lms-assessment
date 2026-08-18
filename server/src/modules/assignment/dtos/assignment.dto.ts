/**
 * Assignment Lifecycle & Strategies
 */
export type AssignmentStatus = 'DRAFT' | 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'GRADING' | 'PUBLISHED' | 'ARCHIVED';
export type SubmissionStrategy = 'SINGLE' | 'LATEST' | 'HIGHEST_SCORE' | 'MANUAL_SELECTION';
export type AssignmentType = 'INDIVIDUAL' | 'GROUP' | 'PEER_REVIEW';

// ---------------------------------------------------------
// ASSIGNMENT AGGREGATE DTOs
// ---------------------------------------------------------
export interface CreateAssignmentDTO {
  tenantId: string;
  courseId: string;
  title: string;
  instructionContent: string;
  type: AssignmentType;
  submissionStrategy: SubmissionStrategy;
  maxAttempts?: number; // 0 for unlimited
  
  // Timing
  scheduledAt?: Date;
  dueDate: Date;
  lateSubmissionAllowed: boolean;
  lateDueDate?: Date;

  // Attached Rubric & Files (IDs linked to Asset/Rubric Domains)
  rubricId?: string;
  attachmentIds?: string[];
}

export interface AssignmentDetailDTO {
  id: string;
  courseId: string;
  status: AssignmentStatus;
  version: number;
  // Payload merged from creation...
}

// ---------------------------------------------------------
// SUBMISSION & VERSIONING DTOs
// ---------------------------------------------------------
export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'LATE' | 'GRADED' | 'RETURNED_FOR_REVISION';

export interface SubmissionVersionDTO {
  versionNumber: number;
  content: string; // Raw text or JSON representation of files
  attachments: string[];
  submittedAt: Date;
  
  // AI Readiness
  aiMetadata: {
    language?: string;
    wordCount?: number;
    estimatedReadingTime?: number;
    similarityScore?: number;
    grammarScore?: number;
    aiGeneratedProbability?: number;
    embeddingStatus: 'PENDING' | 'PROCESSED';
  };
}

export interface SubmissionDetailDTO {
  id: string;
  assignmentId: string;
  studentId: string; // or groupId
  groupId?: string;
  status: SubmissionStatus;
  currentVersion: number;
  history: SubmissionVersionDTO[];
  finalGrade?: number;
}
