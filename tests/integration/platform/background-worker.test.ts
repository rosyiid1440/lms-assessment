import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import prisma, { resetDatabase, disconnectDatabase } from '../../utils/db-reset';
import { MemoryEventBus } from '../../../server/src/core/infrastructure/events/event-bus';
import { AssetUploadedWorker } from '../../../server/src/modules/learning/asset/workers/asset-uploaded.worker';
import { JobContext } from '../../../../server/src/core/infrastructure/workers/base.worker';
import { v4 as uuidv4 } from 'uuid';

describe('Gate 13: Enterprise Background Worker Pipeline', () => {
  let eventBus: MemoryEventBus;
  let worker: AssetUploadedWorker;
  let tenantId: string;

  beforeEach(async () => {
    await resetDatabase();
    eventBus = new MemoryEventBus();
    worker = new AssetUploadedWorker(prisma, eventBus);

    const tenant = await prisma.tenant.create({ data: { name: 'Test', code: `T-${uuidv4()}`, status: 'ACTIVE' } });
    tenantId = tenant.id;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('should process job, update DB, emit event, and be IDEMPOTENT', async () => {
    // 1. Setup Initial State (Asset Uploaded via HTTP API)
    const asset = await prisma.asset.create({
      data: {
        tenantId,
        fingerprint: 'sha256-mock-123',
        originalName: 'book.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        storageProvider: 'LOCAL',
        storageKey: 'local/book.pdf',
        status: 'UPLOADING'
      }
    });

    const jobPayload: JobContext<any> = {
      jobId: uuidv4(),
      correlationId: 'corr-123',
      tenantId,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      priority: 1,
      payload: { assetId: asset.id, fingerprint: asset.fingerprint, mimeType: asset.mimeType }
    };

    // Spy on Event Bus
    let emittedEvent: any = null;
    eventBus.subscribe('content.asset_ready', async (event) => {
      emittedEvent = event;
    });

    // 2. Execute Worker
    await worker.process(jobPayload);

    // 3. Verify Database State Changes (Virus Scan -> Metadata Extraction -> READY)
    const processedAsset = await prisma.asset.findUniqueOrThrow({ where: { id: asset.id } });
    
    expect(processedAsset.status).toBe('READY');
    expect(processedAsset.virusStatus).toBe('CLEAN');
    expect(processedAsset.processingStatus).toBe('COMPLETED');
    expect((processedAsset.metadata as any).pages).toBe(42); // Extracted by worker

    // 4. Verify Pipeline Continuation (Event Emitted)
    // Wait slightly for async memory event bus
    await new Promise(r => setTimeout(r, 50)); 
    expect(emittedEvent).not.toBeNull();
    expect(emittedEvent.metadata.assetId).toBe(asset.id);

    // 5. TEST IDEMPOTENCY
    // If the queue sends the exact same job again due to network glitch
    const initialReadyUpdatedAt = processedAsset.updatedAt.getTime();
    
    await worker.process(jobPayload); // Execute again

    const idempotentAsset = await prisma.asset.findUniqueOrThrow({ where: { id: asset.id } });
    
    // The timestamp should NOT change because validate() aborted the job early
    expect(idempotentAsset.updatedAt.getTime()).toBe(initialReadyUpdatedAt);
  });
});
