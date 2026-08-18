import { ReadonlyDomainEvent } from '../../authorization/types';

interface AcademicYearPayload {
  academicYearId: string;
  name: string;
  status: string;
}

interface SemesterPayload {
  semesterId: string;
  academicYearId: string;
  name: string;
  status: string;
}

export type AcademicYearEvent = ReadonlyDomainEvent<AcademicYearPayload>;
export type SemesterEvent = ReadonlyDomainEvent<SemesterPayload>;

export const ACADEMIC_EVENTS = {
  // Academic Year
  YEAR_CREATED: 'academic.year_created',
  YEAR_ACTIVATED: 'academic.year_activated',
  YEAR_CLOSED: 'academic.year_closed',
  
  // Semester
  SEMESTER_CREATED: 'academic.semester_created',
  SEMESTER_PLANNING_STARTED: 'academic.semester_planning_started',
  SEMESTER_RUNNING: 'academic.semester_running',
  SEMESTER_GRADING_STARTED: 'academic.semester_grading_started',
  SEMESTER_CLOSED: 'academic.semester_closed',
} as const;
