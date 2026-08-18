export interface JobContext {
  jobId: string;
  correlationId: string;
  causationId?: string;
  tenantId?: string;
  createdAt: Date;
  retryCount: number;
  maxRetries: number;
  priority: number;
}
