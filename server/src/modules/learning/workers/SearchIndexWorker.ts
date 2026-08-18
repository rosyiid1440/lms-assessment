import { PrismaClient } from '@prisma/client';
import { PrismaBaseWorker } from '../../../core/worker/PrismaBaseWorker';
import { JobContext } from '../../../core/worker/JobContext';
import { EventBus } from '../../../core/infrastructure/event-bus/EventBus';

export interface LessonPublishedPayload {
  lessonId: string;
  courseId: string;
  title: string;
  content: string;
}

export class SearchIndexWorker extends PrismaBaseWorker<LessonPublishedPayload> {
  constructor(prisma: PrismaClient, private readonly eventBus?: EventBus) {
    super(prisma);
  }

  get name(): string {
    return 'learning.lesson.published';
  }

  protected async validate(payload: LessonPublishedPayload, context: JobContext): Promise<void> {
    if (!payload.lessonId || !payload.title) {
      throw new Error('Invalid payload: missing lessonId or title');
    }
  }

  protected async execute(payload: LessonPublishedPayload, context: JobContext): Promise<void> {
    console.log(`[SearchIndexWorker] Indexing lesson: ${payload.lessonId} in Search Provider`);
    
    // 1. Search Provider (Mocked logic - e.g. Elasticsearch/Meilisearch push)
    // const searchProvider = new MockSearchProvider();
    // await searchProvider.indexDocument('lessons', payload.lessonId, { title: payload.title, content: payload.content });
    
    console.log(`[SearchIndexWorker] Indexed lesson ${payload.lessonId} successfully`);
  }

  protected async onSuccess(payload: LessonPublishedPayload, context: JobContext): Promise<void> {
    console.log(`[SearchIndexWorker] Publishing Indexed Event for lesson: ${payload.lessonId}`);
     // Mock Event
  }
}
