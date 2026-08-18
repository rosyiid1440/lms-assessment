/**
 * Standardized structure for Data Warehouses (ClickHouse, BigQuery)
 * Ready for AI Recommendation and Predictive Analytics.
 */
export interface LearningAnalyticsEvent {
  eventId: string;           // UUID
  eventName: string;         // e.g., 'video_paused', 'lesson_completed'
  aggregateId: string;       // EnrollmentID or ProgressID
  aggregateVersion: number;  // Crucial for Offline Sync Merge Policy
  studentId: string;
  courseId: string;
  chapterId?: string;
  lessonId?: string;
  materialId?: string;
  timestamp: string;         // ISO-8601
  device: string;            // 'MOBILE', 'DESKTOP'
  platform: string;          // 'WEB', 'IOS', 'ANDROID'
  durationMs?: number;       // Time spent on action
  metadata: Record<string, any>; // JSON for specific strategy data (e.g., seek_to: 120)
}

export const ANALYTICS_EVENT_TYPES = {
  LESSON_OPENED: 'lesson_opened',
  LESSON_COMPLETED: 'lesson_completed',
  LESSON_ABANDONED: 'lesson_abandoned',
  MATERIAL_VIEWED: 'material_viewed',
  VIDEO_PAUSED: 'video_paused',
  VIDEO_COMPLETED: 'video_completed',
  PDF_SCROLLED: 'pdf_scrolled',
  QUIZ_STARTED: 'quiz_started',
  QUIZ_SUBMITTED: 'quiz_submitted',
} as const;
