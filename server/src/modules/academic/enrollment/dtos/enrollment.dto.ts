/**
 * Enrollment State Machine
 */
export type EnrollmentStatus = 'PENDING' | 'ACTIVE' | 'TRANSFERRED' | 'GRADUATED' | 'WITHDRAWN' | 'ARCHIVED';

// ---------------------------------------------------------
// INPUT DTOs
// ---------------------------------------------------------
export interface CreateEnrollmentDTO {
  tenantId: string;
  studentId: string;
  classId: string;
  academicYearId: string;
  semesterId: string;
  status?: EnrollmentStatus; // Default: PENDING
}

export interface TransferStudentDTO {
  tenantId: string;
  enrollmentId: string;
  newClassId: string;
  reason: string;
}

// ---------------------------------------------------------
// OUTPUT DTOs / PROJECTIONS
// ---------------------------------------------------------
export interface EnrollmentSummaryDTO {
  id: string;
  studentId: string;
  classId: string;
  academicYearId: string;
  status: EnrollmentStatus;
  updatedAt: Date;
}

export interface ClassRosterDTO {
  classId: string;
  className: string;
  homeroomTeacherId?: string;
  activeStudents: {
    studentId: string;
    enrollmentId: string;
    studentName: string;
    enrolledAt: Date;
  }[];
  transferredOutStudents: {
    studentId: string;
    studentName: string;
    transferredAt: Date;
  }[];
}
