// ---------------------------------------------------------
// INPUT DTOs (Write Operations)
// ---------------------------------------------------------

export interface CreateMajorDTO {
  tenantId: string;
  code: string; // e.g., 'MIPA', 'IPS'
  name: string;
}

export interface CreateClassroomDTO {
  tenantId: string;
  code: string; // e.g., 'R-101'
  name: string; // e.g., 'Ruang Lab Biologi'
  capacity: number;
}

export interface CreateClassDTO {
  tenantId: string;
  code: string; // e.g., 'X-MIPA-1'
  name: string; // e.g., 'Kelas X MIPA 1'
  gradeLevelId: string;
  majorId: string;
  academicYearId: string;
  classroomId?: string; // Optional physical room assignment
}

export interface AssignHomeroomDTO {
  tenantId: string;
  classId: string;
  teacherId: string;
  academicYearId: string;
}

// ---------------------------------------------------------
// OUTPUT DTOs / PROJECTIONS
// ---------------------------------------------------------

export interface MajorSummaryDTO {
  id: string;
  code: string;
  name: string;
}

export interface ClassroomSummaryDTO {
  id: string;
  code: string;
  name: string;
  capacity: number;
}

export interface ClassSummaryDTO {
  id: string;
  code: string;
  name: string;
  gradeLevelName: string;
  majorName: string;
  homeroomTeacherName?: string;
  totalStudents?: number;
}

export interface ClassDetailDTO extends ClassSummaryDTO {
  tenantId: string;
  academicYearId: string;
  classroomId?: string;
  createdAt: Date;
  updatedAt: Date;
}
