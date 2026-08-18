/**
 * Lesson Lifecycle State Machine
 */
export type LessonStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';

// ---------------------------------------------------------
// INPUT DTOs (Write Operations)
// ---------------------------------------------------------

export interface CreateChapterDTO {
  tenantId: string;
  courseId: string;
  title: string;
  description?: string;
  order: number; // Must be unique within courseId
}

export interface ReorderChapterDTO {
  tenantId: string;
  courseId: string;
  chapterId: string;
  newOrder: number;
  expectedVersion: number;
}

export interface CreateLessonDTO {
  tenantId: string;
  chapterId: string;
  title: string;
  description?: string;
  estimatedDuration: number; // in minutes
  order: number; // Unique within chapterId
}

export interface TransitionLessonDTO {
  tenantId: string;
  expectedVersion: number;
  reason?: string;
}

// ---------------------------------------------------------
// OUTPUT DTOs / PROJECTIONS (Read Operations)
// ---------------------------------------------------------

export interface ChapterSummaryDTO {
  id: string;
  courseId: string;
  title: string;
  order: number;
  version: number;
  totalLessons: number;
}

export interface LessonSummaryDTO {
  id: string;
  chapterId: string;
  title: string;
  order: number;
  estimatedDuration: number;
  status: LessonStatus;
  version: number;
}
