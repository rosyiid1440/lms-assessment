import { ReadonlyDomainEvent } from '../../../authorization/types';

interface ClassEventPayload {
  classId: string;
  code: string;
  academicYearId: string;
  majorId: string;
  changedBy?: string;
}

interface HomeroomEventPayload {
  classId: string;
  teacherId: string;
  academicYearId: string;
  changedBy?: string;
}

export type ClassDomainEvent = ReadonlyDomainEvent<ClassEventPayload>;
export type HomeroomDomainEvent = ReadonlyDomainEvent<HomeroomEventPayload>;

export const ACADEMIC_MASTER_EVENTS = {
  MAJOR_CREATED: 'academic.major_created',
  CLASSROOM_CREATED: 'academic.classroom_created',
  CLASS_CREATED: 'academic.class_created',
  CLASS_UPDATED: 'academic.class_updated',
  CLASS_ARCHIVED: 'academic.class_archived',
  HOMEROOM_ASSIGNED: 'academic.homeroom_assigned',
  HOMEROOM_REMOVED: 'academic.homeroom_removed',
} as const;
