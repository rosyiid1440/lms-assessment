import { PrismaClient } from '@prisma/client';
import { BaseWorker, JobContext } from '../../../../core/infrastructure/workers/base.worker';
import { IEventBus } from '../../../../core/infrastructure/events/event-bus';
import { CONTENT_EVENTS } from '../../material/events/material.events';

interface AssetUploadedPayload {
  assetId: string;
  fingerprint: string;
  mimeType: string;
}

/**
 * Pipeline: Asset Uploaded -> Virus Scan -> Metadata -> Ready
 */
export class AssetUploadedWorker extends BaseWorker<AssetUploadedPayload> {
  readonly workerName = 'AssetUploadedWorker';

  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: IEventBus
  ) {
    super();
  }

  protected async validate(job: JobContext<AssetUploadedPayload>): Promise<boolean> {
    const asset = await this.prisma.asset.findUnique({ where: { id: job.payload.assetId } });
    
    // Idempotency: If the asset is already processed or deleted, skip
    if (!asset || asset.status === 'READY' || asset.status === 'DELETED') {
      return false;
    }
    return true;
  }

  protected async execute(job: JobContext<AssetUploadedPayload>): Promise<void> {
    const { assetId, mimeType } = job.payload;

    // 1. Update State to Scanning
    await this.prisma.asset.update({ where: { id: assetId }, data: { status: 'SCANNING' } });

    // 2. Simulate Virus Scan (Call to ClamAV/External API)
    await new Promise(resolve => setTimeout(resolve, 300)); // 300ms network call
    
    // 3. Update State to Processing
    await this.prisma.asset.update({ where: { id: assetId }, data: { status: 'PROCESSING', virusStatus: 'CLEAN' } });

    // 4. Simulate Metadata Extraction (e.g. PDF page count, Video duration)
    let metadata = {};
    if (mimeType === 'application/pdf') {
      metadata = { pages: 42, width: 800, height: 600 };
    } else if (mimeType.startsWith('video/')) {
      metadata = { durationSeconds: 1200, resolution: '1080p' };
    }
    await new Promise(resolve => setTimeout(resolve, 200));

    // 5. Finalize State
    await this.prisma.asset.update({ 
      where: { id: assetId }, 
      data: { status: 'READY', processingStatus: 'COMPLETED', metadata } 
    });
  }

  protected async onSuccess(job: JobContext<AssetUploadedPayload>): Promise<void> {
    // Pipeline Continuation: Emit event for UI to update or next workers
    await this.eventBus.publish({
      eventId: require('crypto').randomUUID(),
      eventName: CONTENT_EVENTS.ASSET_READY,
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      tenantId: job.tenantId,
      correlationId: job.correlationId,
      requestId: 'worker-req',
      metadata: { assetId: job.payload.assetId }
    });
  }

  protected async onFailure(job: JobContext<AssetUploadedPayload>, error: Error): Promise<void> {
    // If it fails, mark processing status as FAILED so dashboard knows
    await this.prisma.asset.update({ 
      where: { id: job.payload.assetId }, 
      data: { processingStatus: 'FAILED' } 
    });
  }

  protected async scheduleRetry(job: JobContext<AssetUploadedPayload>, error: Error): Promise<void> {
    // In BullMQ, you just throw the error and BullMQ handles backoff based on queue settings.
    // Here we might manually re-enqueue into our MemoryQueue if using a custom implementation.
    console.log(`[WORKER RETRY] Scheduling retry for ${job.jobId} (Attempt ${job.retryCount + 1})`);
  }
}
