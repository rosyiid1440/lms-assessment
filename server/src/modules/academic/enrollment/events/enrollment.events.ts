import { ReadonlyDomainEvent } from '../../../authorization/types';

interface EnrollmentPayload {
  enrollmentId: string;
  studentId: string;
  classId: string;
  academicYearId: string;
  semesterId: string;
}

interface TransferPayload extends EnrollmentPayload {
  oldEnrollmentId: string;
  oldClassId: string;
  reason: string;
}

export type EnrollmentDomainEvent = ReadonlyDomainEvent<EnrollmentPayload>;
export type TransferDomainEvent = ReadonlyDomainEvent<TransferPayload>;

export const ENROLLMENT_EVENTS = {
  ENROLLMENT_CREATED: 'academic.enrollment_created',
  ENROLLMENT_ACTIVATED: 'academic.enrollment_activated',
  STUDENT_TRANSFERRED: 'academic.student_transferred',
  ENROLLMENT_GRADUATED: 'academic.enrollment_graduated',
  ENROLLMENT_WITHDRAWN: 'academic.enrollment_withdrawn',
  ENROLLMENT_ARCHIVED: 'academic.enrollment_archived',
} as const;
