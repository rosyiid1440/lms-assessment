import { JobQueue, JobOptions } from './JobQueue';

export class JobDispatcher {
  constructor(private readonly queue: JobQueue) {}

  public async dispatch<T>(jobName: string, payload: T, options: JobOptions): Promise<string> {
    // Pipeline: Outbox Event -> EventBus -> Job Dispatcher -> Job Queue
    return await this.queue.enqueue(jobName, payload, options);
  }
}
