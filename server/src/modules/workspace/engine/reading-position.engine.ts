import { UpdateReadingPositionDTO, ContinueLearningProjection } from '../dtos/workspace.dto';
import { WORKSPACE_EVENTS } from '../events/workspace.events';
import { IEventPublisher } from '../../authorization/service';
import { ConflictException } from '../../../core/exceptions/app.exception';

export interface IReadingPositionRepository {
  findCurrentPosition(studentId: string, courseId: string): Promise<ContinueLearningProjection | null>;
  upsertPosition(data: UpdateReadingPositionDTO): Promise<ContinueLearningProjection>;
}

export class ReadingPositionEngine {
  constructor(
    private readonly repo: IReadingPositionRepository,
    private readonly eventPublisher: IEventPublisher
  ) {}

  /**
   * Resumes learning and handles cross-device synchronization logic.
   */
  async updatePosition(data: UpdateReadingPositionDTO): Promise<void> {
    const current = await this.repo.findCurrentPosition(data.studentId, data.courseId);
    
    // Offline-First Sync Validation
    // If the expected version from the client is older than the DB, it means another device
    // has already advanced the learning position. We reject this to prevent backward syncs.
    if (current && data.expectedVersion < (current as any).version) {
       throw new ConflictException('A newer reading position exists from another device.');
    }

    const updated = await this.repo.upsertPosition(data);

    // Publish Private Event
    this.eventPublisher.publish({
      eventId: require('crypto').randomUUID(),
      eventName: WORKSPACE_EVENTS.READING_POSITION_UPDATED,
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      tenantId: 'resolved-tenant-id', // From context
      correlationId: 'trace-id',
      requestId: 'req-id',
      metadata: {
        studentId: data.studentId,
        courseId: data.courseId,
        lessonId: data.lessonId,
        device: data.device
      }
    });
  }
}
