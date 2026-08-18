import { PrismaClient } from '@prisma/client';
import { JobQueue, JobOptions } from './JobQueue';
import { randomUUID } from 'crypto';

export class PostgresJobQueue implements JobQueue {
  constructor(private readonly prisma: PrismaClient) {}

  async enqueue<T>(name: string, payload: T, options: JobOptions): Promise<string> {
    const processAt = options.delayMs 
      ? new Date(Date.now() + options.delayMs)
      : new Date();

    const job = await this.prisma.job.create({
      data: {
        name,
        payload: payload as any,
        status: 'PENDING',
        correlationId: options.correlationId,
        causationId: options.causationId,
        tenantId: options.tenantId,
        maxRetries: options.maxRetries ?? 3,
        priority: options.priority ?? 0,
        processAt,
      }
    });

    return job.id;
  }
}
