import { TransitionLessonDTO, LessonSummaryDTO, LessonStatus } from '../dtos/learning.dto';
import { LessonStateMachine } from '../engine/lesson.state-machine';
import { LEARNING_EVENTS } from '../events/learning.events';
import { IEventPublisher } from '../../authorization/service';
import { IRequestContext } from '../../../core/context/request-context.service';
import { ConflictException, ResourceNotFoundException } from '../../../core/exceptions/app.exception';

export interface ILessonRepository {
  findById(lessonId: string): Promise<LessonSummaryDTO | null>;
  updateStatus(lessonId: string, status: LessonStatus, expectedVersion: number): Promise<LessonSummaryDTO>;
}

export class LessonService {
  constructor(
    private readonly repo: ILessonRepository,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async publishLesson(lessonId: string, data: TransitionLessonDTO, ctx: IRequestContext): Promise<void> {
    await this.transitionState(lessonId, 'PUBLISHED', data, ctx, LEARNING_EVENTS.LESSON_PUBLISHED);
  }

  async archiveLesson(lessonId: string, data: TransitionLessonDTO, ctx: IRequestContext): Promise<void> {
    await this.transitionState(lessonId, 'ARCHIVED', data, ctx, LEARNING_EVENTS.LESSON_ARCHIVED);
  }

  async revertToDraft(lessonId: string, data: TransitionLessonDTO, ctx: IRequestContext): Promise<void> {
    await this.transitionState(lessonId, 'DRAFT', data, ctx, LEARNING_EVENTS.LESSON_REVERTED_TO_DRAFT);
  }

  // --- Private Engine ---
  private async transitionState(
    lessonId: string, 
    nextStatus: LessonStatus, 
    data: TransitionLessonDTO, 
    ctx: IRequestContext,
    eventName: string
  ): Promise<void> {
    const lesson = await this.repo.findById(lessonId);
    if (!lesson) throw new ResourceNotFoundException('Lesson', lessonId);

    // 1. State Machine Validation
    LessonStateMachine.validateTransition(lesson.status, nextStatus);

    // 2. OCC / Atomic Update
    try {
      const updated = await this.repo.updateStatus(lessonId, nextStatus, data.expectedVersion);
      
      // 3. Domain Event
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
          lessonId: updated.id,
          chapterId: updated.chapterId,
          // courseId: updated.courseId, (Assumes we pull courseId in repo lookup)
          status: updated.status,
          version: updated.version,
        }
      });
    } catch (error: any) {
      if (error.message === 'OCC_FAILED') {
        throw new ConflictException('Lesson was modified by another editor. Refresh and try again.');
      }
      throw error;
    }
  }
}
