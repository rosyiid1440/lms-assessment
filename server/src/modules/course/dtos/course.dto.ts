/**
 * Course Lifecycle State Machine
 */
export type CourseStatus = 'DRAFT' | 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

// ---------------------------------------------------------
// INPUT DTOs (Write Operations)
// ---------------------------------------------------------
export interface CreateCourseDTO {
  tenantId: string;
  subjectId: string;
  classId: string;
  teacherId: string; // Primary Teacher
  academicYearId: string;
  semesterId: string;
  
  // Future Ready: Team Teaching
  coTeacherIds?: string[];
}

export interface UpdateCourseScheduleDTO {
  expectedVersion: number;
  schedules: {
    dayOfWeek: number;
    startTime: string; // HH:mm
    endTime: string;
    classroomId?: string;
  }[];
}

export interface TransitionCourseDTO {
  expectedVersion: number;
  reason?: string;
}

// ---------------------------------------------------------
// OUTPUT DTOs / PROJECTIONS (Read-Optimized)
// ---------------------------------------------------------
export interface CourseSummaryDTO {
  id: string;
  tenantId: string;
  subjectName: string;
  className: string;
  teacherName: string;
  status: CourseStatus;
  version: number;
}

export interface CourseDetailDTO extends CourseSummaryDTO {
  subjectId: string;
  classId: string;
  teacherId: string;
  academicYearId: string;
  semesterId: string;
  
  coTeachers: { id: string; name: string }[];
  schedules: any[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentCourseListDTO {
  studentId: string;
  courses: CourseSummaryDTO[];
}
