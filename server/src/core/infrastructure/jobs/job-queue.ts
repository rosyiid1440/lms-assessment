/**
 * Abstract Background Job Payload
 */
export interface JobData {
  jobId: string;
  type: string;
  payload: Record<string, any>;
  retryCount?: number;
}

/**
 * Universal Background Job Queue Interface.
 * Agnostic to BullMQ (Redis) or SQS.
 */
export interface IJobQueue {
  /**
   * Enqueues a job for background processing.
   */
  enqueue(type: string, payload: Record<string, any>, delayMs?: number): Promise<string>;
  
  /**
   * Registers a worker to process jobs of a specific type.
   */
  process(type: string, processor: (data: JobData) => Promise<void>, concurrency?: number): void;
}

/**
 * Local memory queue for development.
 * In production, this gets swapped with BullMqJobQueue.
 */
export class MemoryJobQueue implements IJobQueue {
  enqueue(type: string, payload: Record<string, any>, delayMs = 0): Promise<string> {
    const jobId = require('crypto').randomUUID();
    
    // Simulate Queuing
    // console.log(`[QUEUE] Enqueued Job: ${type} (${jobId})`);
    
    return Promise.resolve(jobId);
  }

  process(type: string, processor: (data: JobData) => Promise<void>, concurrency = 1): void {
    // In memory, we would use setInterval or immediate execution to pop jobs from an array.
    // Omitted implementation details for brevity.
  }
}
