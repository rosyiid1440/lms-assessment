/**
 * Workspace Aggregate Enums
 */
export type NoteType = 'PLAIN' | 'STICKY' | 'TIMESTAMP' | 'REFLECTION' | 'QUOTE';
export type HighlightColor = 'YELLOW' | 'GREEN' | 'BLUE' | 'RED' | 'CUSTOM';
export type SyncStatus = 'SYNCED' | 'CONFLICT' | 'DRAFT';

// ---------------------------------------------------------
// INPUT / COMMAND DTOs
// ---------------------------------------------------------

export interface CreateNoteDTO {
  studentId: string;
  courseId: string;
  lessonId?: string;
  materialId?: string;
  type: NoteType;
  title?: string;
  rawContent: string; // Markdown or Rich Text
  positionContext?: Record<string, any>; // e.g. { timestamp: 3600 }
  expectedVersion: number;
  deviceId: string;
}

export interface CreateHighlightDTO {
  studentId: string;
  courseId: string;
  materialId: string;
  color: HighlightColor;
  label?: string; // e.g., 'IMPORTANT', 'EXAM'
  selectedText: string;
  positionContext: Record<string, any>; // e.g. { page: 12, startOffset: 15, endOffset: 45 }
}

export interface UpdateReadingPositionDTO {
  studentId: string;
  courseId: string;
  lessonId: string;
  materialId?: string;
  positionContext: Record<string, any>;
  device: string;
  expectedVersion: number;
}

// ---------------------------------------------------------
// PROJECTIONS / READ MODELS
// ---------------------------------------------------------

export interface ContinueLearningProjection {
  studentId: string;
  courseId: string;
  courseName: string;
  lastLessonId: string;
  lastLessonTitle: string;
  lastMaterialId?: string;
  lastPosition?: Record<string, any>;
  lastVisitedAt: Date;
  device: string;
}

export interface PinnedNoteProjection {
  id: string;
  lessonTitle: string;
  title: string;
  snippet: string;
  updatedAt: Date;
}

// ---------------------------------------------------------
// AGGREGATE ENTITIES (AI-Ready & Offline First)
// ---------------------------------------------------------

export interface NoteEntity {
  id: string;
  studentId: string;
  type: NoteType;
  encryptedContent: string; // The encrypted text
  searchableContent: string; // Stripped down text (can be hashed/vectorized)
  
  // AI Readiness
  summary?: string;
  keywords?: string[];
  embeddingStatus: 'PENDING' | 'PROCESSED' | 'FAILED';
  difficulty?: number; // Detected by AI based on reflection language
  
  // Offline Sync
  version: number;
  syncStatus: SyncStatus;
  lastDeviceId: string;
  updatedAt: Date;
}
