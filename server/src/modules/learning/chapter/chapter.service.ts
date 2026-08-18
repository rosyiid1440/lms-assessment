import { CreateChapterDTO, ReorderChapterDTO, ChapterSummaryDTO } from '../dtos/learning.dto';
import { LEARNING_EVENTS } from '../events/learning.events';
import { IEventPublisher } from '../../authorization/service';
import { IRequestContext } from '../../../core/context/request-context.service';
import { ConflictException, ResourceNotFoundException } from '../../../core/exceptions/app.exception';

export interface IChapterRepository {
  create(data: CreateChapterDTO): Promise<ChapterSummaryDTO>;
  reorder(courseId: string, chapterId: string, newOrder: number, expectedVersion: number): Promise<void>;
  checkOrderExists(courseId: string, order: number): Promise<boolean>;
}

export class ChapterService {
  constructor(
    private readonly repo: IChapterRepository,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async createChapter(data: CreateChapterDTO, ctx: IRequestContext): Promise<ChapterSummaryDTO> {
    // 1. Business Validation: Order uniqueness
    const orderExists = await this.repo.checkOrderExists(data.courseId, data.order);
    if (orderExists) {
      throw new ConflictException(`Order ${data.order} is already taken in this course.`);
    }

    // 2. Persist
    const chapter = await this.repo.create(data);

    // 3. Domain Event
    this.publishEvent(LEARNING_EVENTS.CHAPTER_CREATED, chapter, ctx);

    return chapter;
  }

  // Orchestrates shifting of orders atomically
  async reorderChapter(data: ReorderChapterDTO, ctx: IRequestContext): Promise<void> {
    try {
      await this.repo.reorder(data.courseId, data.chapterId, data.newOrder, data.expectedVersion);
      
      // Notify mobile apps/clients that cache needs invalidation
      this.publishEvent(LEARNING_EVENTS.CHAPTER_REORDERED, { id: data.chapterId, courseId: data.courseId, version: data.expectedVersion + 1 }, ctx);
    } catch (error: any) {
      if (error.message === 'OCC_FAILED') {
        throw new ConflictException('Chapter structure modified by another teacher. Refresh and try again.');
      }
      throw error;
    }
  }

  private publishEvent(eventName: string, entity: any, ctx: IRequestContext): void {
    this.eventPublisher.publish({
      eventId: require('crypto').randomUUID(),
      eventName,
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      tenantId: ctx.identity?.tenantId!,
      userId: ctx.identity?.userId,
      correlationId: ctx.correlationId,
      requestId: ctx.requestId,
      metadata: {
        chapterId: entity.id,
        courseId: entity.courseId,
        version: entity.version,
      }
    });
  }
}
