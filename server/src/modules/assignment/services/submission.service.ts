import { SubmissionDetailDTO, SubmissionVersionDTO } from '../dtos/assignment.dto';
import { ASSIGNMENT_EVENTS } from '../events/assignment.events';
import { IEventPublisher } from '../../authorization/service';
import { IRequestContext } from '../../../core/context/request-context.service';
import { ConflictException, BusinessRuleException } from '../../../core/exceptions/app.exception';
import { ISimilarityProvider } from '../providers/similarity.provider';
import { GlobalMetrics } from '../../../core/observability/metric.publisher';

export interface ISubmissionCommandRepository {
  /** Retrieves submission + its historical versions */
  findById(id: string, tenantId: string): Promise<SubmissionDetailDTO | null>;
  
  /** Atomically adds a new version to the append-only log and updates currentVersion */
  appendVersion(submissionId: string, tenantId: string, versionData: Omit<SubmissionVersionDTO, 'versionNumber'>, expectedCurrentVersion: number): Promise<SubmissionDetailDTO>;
  
  /** Changes Status (e.g. DRAFT to SUBMITTED) */
  updateStatus(submissionId: string, tenantId: string, status: string, expectedVersion: number): Promise<void>;
}

export class SubmissionService {
  constructor(
    private readonly repo: ISubmissionCommandRepository,
    private readonly similarityProvider: ISimilarityProvider,
    private readonly eventPublisher: IEventPublisher
  ) {}

  /**
   * Fast <20ms Auto-Save for student drafts.
   */
  async autoSaveDraft(submissionId: string, content: string, expectedVersion: number, ctx: IRequestContext): Promise<void> {
    const startTime = process.hrtime();
    const tenantId = ctx.identity?.tenantId!;

    try {
      // 1. Append Version (OCC Protected)
      await this.repo.appendVersion(submissionId, tenantId, {
        content,
        attachments: [],
        submittedAt: new Date(),
        aiMetadata: { embeddingStatus: 'PENDING' } // Queue for AI later
      }, expectedVersion);

      // 2. Metrics Target < 20ms
      const diff = process.hrtime(startTime);
      GlobalMetrics.recordHistogram('submission_draft_save_latency_ms', diff[0] * 1e3 + diff[1] * 1e-6);

      // 3. Emit Domain Event (No notifications triggered for Drafts)
      // this.publishEvent(ASSIGNMENT_EVENTS.SUBMISSION_SAVED, ...);
    } catch (e: any) {
      if (e.message === 'OCC_FAILED') throw new ConflictException('Sync error: Draft modified elsewhere.');
      throw e;
    }
  }

  /**
   * Final submission triggers Plagiarism Check and Notifications.
   */
  async submitAssignment(submissionId: string, expectedVersion: number, ctx: IRequestContext): Promise<void> {
    const tenantId = ctx.identity?.tenantId!;
    const submission = await this.repo.findById(submissionId, tenantId);
    if (!submission) throw new BusinessRuleException('Submission not found');

    // State validation
    if (submission.status !== 'DRAFT' && submission.status !== 'RETURNED_FOR_REVISION') {
      throw new BusinessRuleException('Only Draft or Returned submissions can be submitted.');
    }

    await this.repo.updateStatus(submissionId, tenantId, 'SUBMITTED', expectedVersion);

    // Asynchronous Plagiarism Check Trigger
    // A background worker would typically catch this event and use ISimilarityProvider
    this.eventPublisher.publish({
      eventId: require('crypto').randomUUID(),
      eventName: ASSIGNMENT_EVENTS.SUBMISSION_SUBMITTED,
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      tenantId,
      correlationId: ctx.correlationId,
      requestId: ctx.requestId,
      metadata: { submissionId, studentId: submission.studentId, assignmentId: submission.assignmentId, version: expectedVersion + 1 }
    });
  }
}
