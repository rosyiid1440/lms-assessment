import { CourseStatus } from '../dtos/course.dto';

// Projection specific DTOs
export interface CourseCardDTO {
  id: string;
  subjectName: string;
  className: string;
  teacherName: string;
  status: CourseStatus;
}

export interface TeacherCourseSummaryDTO {
  id: string;
  subjectName: string;
  className: string;
  activeStudents: number;
  schedules: any[]; // Simplified array of strings e.g. ["Mon 08:00", "Thu 10:00"]
}

/**
 * Pure Projection Mapper. 
 * Converts aggressively selected DB payloads to lightweight Read Models.
 */
export class CourseProjectionMapper {
  
  static toCourseCard(entity: any): CourseCardDTO {
    return {
      id: entity.id,
      subjectName: entity.subject?.name || 'N/A',
      className: entity.class?.name || 'N/A',
      teacherName: entity.teacher?.fullName || 'N/A',
      status: entity.status as CourseStatus,
    };
  }

  static toTeacherSummary(entity: any): TeacherCourseSummaryDTO {
    return {
      id: entity.id,
      subjectName: entity.subject?.name || 'N/A',
      className: entity.class?.name || 'N/A',
      // Assuming _count relations are pulled in QueryRepo
      activeStudents: entity.class?._count?.enrollments || 0,
      schedules: entity.schedules?.map((s: any) => `${s.dayOfWeek} ${s.startTime}-${s.endTime}`) || []
    };
  }
}
