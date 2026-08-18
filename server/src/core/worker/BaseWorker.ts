import { JobContext } from './JobContext';

export abstract class BaseWorker<TPayload> {
  abstract get name(): string;

  public async process(payload: TPayload, context: JobContext): Promise<void> {
    const startTime = Date.now();
    
    try {
      // 1. Observability: queueTime
      this.recordQueueTime(context.createdAt, startTime);

      // 2. Idempotency Check (Should be implemented by subclass or decorator if needed)
      if (await this.isProcessed(context.jobId)) {
        return;
      }

      // 3. Validate
      await this.validate(payload, context);

      // 4. Execute
      await this.execute(payload, context);

      // 5. Mark as processed for Idempotency
      await this.markAsProcessed(context.jobId);

      // 6. On Success
      await this.onSuccess(payload, context);

      // Observability: executionTime
      this.recordExecutionTime(startTime, Date.now(), 'success');
      
    } catch (error: any) {
      // Observability: failureReason, executionTime
      this.recordExecutionTime(startTime, Date.now(), 'failure');
      this.recordFailureReason(error.message);

      await this.onFailure(error, payload, context);

      if (context.retryCount < context.maxRetries) {
        await this.scheduleRetry(payload, context);
      } else {
        await this.handleDeadLetter(payload, context, error);
      }
      
      throw error; // Re-throw so the queue knows it failed
    }
  }

  protected abstract validate(payload: TPayload, context: JobContext): Promise<void>;
  protected abstract execute(payload: TPayload, context: JobContext): Promise<void>;
  
  protected async onSuccess(payload: TPayload, context: JobContext): Promise<void> {
    // Default empty implementation, can be overridden
  }

  protected async onFailure(error: Error, payload: TPayload, context: JobContext): Promise<void> {
     // Default empty implementation, can be overridden
  }

  protected abstract scheduleRetry(payload: TPayload, context: JobContext): Promise<void>;
  
  protected async handleDeadLetter(payload: TPayload, context: JobContext, error: Error): Promise<void> {
     // Default dead letter logic
  }

  // --- Idempotency Methods (To be implemented with DB/Redis) ---
  protected abstract isProcessed(jobId: string): Promise<boolean>;
  protected abstract markAsProcessed(jobId: string): Promise<void>;

  // --- Observability Hooks ---
  private recordQueueTime(createdAt: Date, startTime: number) {
    const queueTime = startTime - createdAt.getTime();
    // Hook for Prometheus/OpenTelemetry: record queue time
  }

  private recordExecutionTime(startTime: number, endTime: number, status: 'success' | 'failure') {
    const executionTime = endTime - startTime;
    // Hook for Prometheus/OpenTelemetry: record execution time with status label
  }

  private recordFailureReason(reason: string) {
     // Hook for Prometheus/OpenTelemetry: record failure reason
  }
}
