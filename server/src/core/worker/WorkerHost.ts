import { PrismaClient, Job } from '@prisma/client';
import { BaseWorker } from './BaseWorker';
import { JobContext } from './JobContext';

export class WorkerHost {
  private workers: Map<string, BaseWorker<any>> = new Map();
  private isRunning: boolean = false;
  private currentPromises: Set<Promise<void>> = new Set();
  
  constructor(
    private readonly prisma: PrismaClient,
    private readonly workerId: string = `worker-${process.pid}-${Date.now()}`,
    private readonly pollIntervalMs: number = 1000
  ) {}

  public registerWorker(worker: BaseWorker<any>): void {
    this.workers.set(worker.name, worker);
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[WorkerHost ${this.workerId}] Started.`);
    this.pollLoop();
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    console.log(`[WorkerHost ${this.workerId}] Stopping... Waiting for ${this.currentPromises.size} jobs to finish.`);
    await Promise.allSettled(this.currentPromises);
    console.log(`[WorkerHost ${this.workerId}] Stopped.`);
  }

  private async pollLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        const job = await this.fetchNextJob();
        
        if (job) {
          const promise = this.processJob(job).finally(() => {
            this.currentPromises.delete(promise);
          });
          this.currentPromises.add(promise);
        } else {
           // Wait before next poll if no job found
           await new Promise(resolve => setTimeout(resolve, this.pollIntervalMs));
        }
      } catch (error) {
        console.error(`[WorkerHost ${this.workerId}] Error in poll loop:`, error);
        await new Promise(resolve => setTimeout(resolve, this.pollIntervalMs));
      }
    }
  }

  private async fetchNextJob(): Promise<Job | null> {
    // 1. Transaction to find and lock a job atomically
    return await this.prisma.$transaction(async (tx) => {
      // Find pending or eligible to process
      const jobs = await tx.$queryRaw<Job[]>`
        SELECT * FROM jobs 
        WHERE status = 'PENDING' 
          AND "processAt" <= NOW()
          AND ("lockedAt" IS NULL OR "lockedAt" < NOW() - INTERVAL '5 minutes')
        ORDER BY priority DESC, "processAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;

      if (!jobs || jobs.length === 0) {
        return null;
      }

      const jobToLock = jobs[0];

      // Lock it
      const lockedJob = await tx.job.update({
        where: { id: jobToLock.id },
        data: {
          status: 'PROCESSING',
          lockedAt: new Date(),
          lockedBy: this.workerId
        }
      });

      return lockedJob;
    });
  }

  private async processJob(job: Job): Promise<void> {
    const worker = this.workers.get(job.name);
    
    if (!worker) {
      console.warn(`[WorkerHost] No worker registered for job type: ${job.name}. Marking as Failed.`);
      await this.prisma.job.update({
        where: { id: job.id },
        data: { status: 'FAILED', error: 'No worker registered' }
      });
      return;
    }

    const context: JobContext = {
      jobId: job.id,
      correlationId: job.correlationId,
      causationId: job.causationId || undefined,
      tenantId: job.tenantId || undefined,
      createdAt: job.createdAt,
      retryCount: job.retryCount,
      maxRetries: job.maxRetries,
      priority: job.priority
    };

    try {
      await worker.process(job.payload as any, context);
      
      // If success, update to completed
      await this.prisma.job.update({
        where: { id: job.id },
        data: { status: 'COMPLETED' }
      });

    } catch (error: any) {
       console.error(`[WorkerHost] Job ${job.id} failed:`, error);
       
       const nextRetryCount = job.retryCount + 1;
       const hasRetriesLeft = nextRetryCount <= job.maxRetries;

       await this.prisma.job.update({
         where: { id: job.id },
         data: {
           status: hasRetriesLeft ? 'PENDING' : 'DEAD_LETTER',
           retryCount: nextRetryCount,
           error: error.message,
           stackTrace: error.stack,
           // Exponential backoff for retry
           processAt: hasRetriesLeft ? new Date(Date.now() + Math.pow(2, nextRetryCount) * 1000) : job.processAt,
           lockedAt: null,
           lockedBy: null
         }
       });
    }
  }
}
