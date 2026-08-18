import { ReadonlyDomainEvent } from '../../authorization/types';

interface ChapterEventPayload {
  chapterId: string;
  courseId: string;
  version: number;
}

interface LessonEventPayload {
  lessonId: string;
  chapterId: string;
  courseId: string;
  status: string;
  version: number;
}

export type ChapterDomainEvent = ReadonlyDomainEvent<ChapterEventPayload>;
export type LessonDomainEvent = ReadonlyDomainEvent<LessonEventPayload>;

export const LEARNING_EVENTS = {
  CHAPTER_CREATED: 'learning.chapter_created',
  CHAPTER_REORDERED: 'learning.chapter_reordered',
  
  LESSON_CREATED: 'learning.lesson_created',
  LESSON_PUBLISHED: 'learning.lesson_published',
  LESSON_ARCHIVED: 'learning.lesson_archived',
  LESSON_REVERTED_TO_DRAFT: 'learning.lesson_reverted_to_draft',
} as const;
