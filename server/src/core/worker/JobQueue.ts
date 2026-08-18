import { JobContext } from './JobContext';

export interface JobOptions {
  correlationId: string;
  causationId?: string;
  tenantId?: string;
  maxRetries?: number;
  priority?: number;
  delayMs?: number;
}

export interface JobQueue {
  enqueue<T>(name: string, payload: T, options: JobOptions): Promise<string>;
}
