/**
 * Academic Year & Semester State Machines
 */
export type AcademicYearStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
export type SemesterStatus = 'DRAFT' | 'PLANNING' | 'RUNNING' | 'GRADING' | 'CLOSED' | 'ARCHIVED';
export type SemesterType = 'ODD' | 'EVEN';

// ---------------------------------------------------------
// INPUT DTOs
// ---------------------------------------------------------
export interface CreateAcademicYearDTO {
  tenantId: string;
  name: string; // e.g., "2023/2024"
  startDate: Date;
  endDate: Date;
  status: AcademicYearStatus; // Usually starts as DRAFT
}

export interface CreateSemesterDTO {
  tenantId: string;
  academicYearId: string;
  name: string; // e.g., "Semester Ganjil"
  type: SemesterType;
  startDate: Date;
  endDate: Date;
  status: SemesterStatus; // Usually starts as DRAFT
}

// ---------------------------------------------------------
// PROJECTIONS / OUTPUT DTOs
// ---------------------------------------------------------
export interface AcademicSummaryDTO {
  id: string;
  name: string;
  status: AcademicYearStatus;
  startDate: Date;
  endDate: Date;
}

export interface SemesterSummaryDTO {
  id: string;
  academicYearId: string;
  name: string;
  type: SemesterType;
  status: SemesterStatus;
}
