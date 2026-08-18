import { PrismaClient } from '@prisma/client';
import { PostgresJobQueue } from '../../../server/src/core/worker/PostgresJobQueue';
import { WorkerHost } from '../../../server/src/core/worker/WorkerHost';
import { AssetUploadedWorker } from '../../../server/src/modules/learning/workers/AssetUploadedWorker';
import { JobDispatcher } from '../../../server/src/core/worker/JobDispatcher';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

describe('Worker Integration Tests', () => {
  let queue: PostgresJobQueue;
  let dispatcher: JobDispatcher;
  let host: WorkerHost;
  
  beforeAll(async () => {
    queue = new PostgresJobQueue(prisma);
    dispatcher = new JobDispatcher(queue);
    host = new WorkerHost(prisma, 'test-worker-host', 100); // Fast poll for testing

    const assetWorker = new AssetUploadedWorker(prisma);
    host.registerWorker(assetWorker);

    // Clean up
    await prisma.job.deleteMany();
    await prisma.idempotencyKey.deleteMany();
    await prisma.asset.deleteMany();
    
    // Start host
    host.start();
  });

  afterAll(async () => {
    await host.stop();
    await prisma.$disconnect();
  });

  it('should process job, update database, and maintain idempotency', async () => {
    // 1. Prepare data
    const assetId = randomUUID();
    await prisma.asset.create({
      data: {
        id: assetId,
        title: 'Test Asset',
        type: 'VIDEO',
        fileUrl: 'http://example.com/video.mp4',
        mimeType: 'video/mp4',
        status: 'UPLOADED',
        size: 1000,
        provider: 'LOCAL'
      }
    });

    // 2. Dispatch job
    const jobId = await dispatcher.dispatch('learning.asset.uploaded', {
      assetId,
      fileUrl: 'http://example.com/video.mp4',
      mimeType: 'video/mp4'
    }, {
      correlationId: randomUUID(),
      tenantId: randomUUID()
    });

    // 3. Wait for processing
    await new Promise(resolve => setTimeout(resolve, 500));

    // 4. Assert Job Status
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    expect(job).not.toBeNull();
    expect(job?.status).toBe('COMPLETED');

    // 5. Assert Database State
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    expect(asset?.status).toBe('READY');
    expect(asset?.metadata).toBeDefined();

    // 6. Assert Idempotency Key Exists
    const idempotencyRecord = await prisma.idempotencyKey.findFirst({
      where: { key: { contains: jobId } }
    });
    expect(idempotencyRecord).not.toBeNull();
  });
});
