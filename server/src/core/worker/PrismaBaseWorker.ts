import { PrismaClient } from '@prisma/client';
import { BaseWorker } from './BaseWorker';
import { JobContext } from './JobContext';

export abstract class PrismaBaseWorker<TPayload> extends BaseWorker<TPayload> {
  constructor(protected readonly prisma: PrismaClient) {
    super();
  }

  protected async isProcessed(jobId: string): Promise<boolean> {
    const key = `worker:${this.name}:job:${jobId}`;
    const idempotencyRecord = await this.prisma.idempotencyKey.findUnique({
      where: { key }
    });
    return !!idempotencyRecord;
  }

  protected async markAsProcessed(jobId: string): Promise<void> {
    const key = `worker:${this.name}:job:${jobId}`;
    await this.prisma.idempotencyKey.create({
      data: {
        key,
        workerName: this.name,
      }
    });
  }

  protected async scheduleRetry(payload: TPayload, context: JobContext): Promise<void> {
    // WorkerHost handles backoff retry at DB level, 
    // so this is mostly a hook for custom retry logic if needed.
    console.log(`[Worker ${this.name}] Job ${context.jobId} scheduled for retry (${context.retryCount}/${context.maxRetries})`);
  }
}
