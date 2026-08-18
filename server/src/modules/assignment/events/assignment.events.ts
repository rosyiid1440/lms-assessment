import { ReadonlyDomainEvent } from '../../authorization/types';

interface AssignmentPayload {
  assignmentId: string;
  courseId: string;
  status: string;
  version: number;
}

interface SubmissionPayload {
  submissionId: string;
  assignmentId: string;
  studentId: string;
  status: string;
  version: number;
}

export const ASSIGNMENT_EVENTS = {
  ASSIGNMENT_CREATED: 'assignment.created',
  ASSIGNMENT_OPENED: 'assignment.opened',
  ASSIGNMENT_CLOSED: 'assignment.closed',
  ASSIGNMENT_PUBLISHED: 'assignment.published',
  
  SUBMISSION_SAVED: 'submission.saved', // Auto-save draft
  SUBMISSION_SUBMITTED: 'submission.submitted',
  SUBMISSION_RESUBMITTED: 'submission.resubmitted',
  SUBMISSION_GRADED: 'submission.graded',
  
  FEEDBACK_PUBLISHED: 'feedback.published',
  SIMILARITY_CHECK_COMPLETED: 'similarity.checked',
} as const;

export type AssignmentDomainEvent = ReadonlyDomainEvent<AssignmentPayload>;
export type SubmissionDomainEvent = ReadonlyDomainEvent<SubmissionPayload>;
