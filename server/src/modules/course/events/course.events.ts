import { ReadonlyDomainEvent } from '../../authorization/types';

interface CourseEventPayload {
  courseId: string;
  subjectId: string;
  classId: string;
  teacherId: string;
  version: number;
}

interface ScheduleChangedPayload extends CourseEventPayload {
  newSchedules: any[];
}

export type CourseDomainEvent = ReadonlyDomainEvent<CourseEventPayload>;
export type CourseScheduleEvent = ReadonlyDomainEvent<ScheduleChangedPayload>;

export const COURSE_EVENTS = {
  COURSE_CREATED: 'course.created',
  COURSE_PLANNED: 'course.planned',
  COURSE_ACTIVATED: 'course.activated',
  COURSE_COMPLETED: 'course.completed',
  COURSE_ARCHIVED: 'course.archived',
  TEACHER_ASSIGNED: 'course.teacher_assigned',
  SCHEDULE_CHANGED: 'course.schedule_changed',
} as const;
