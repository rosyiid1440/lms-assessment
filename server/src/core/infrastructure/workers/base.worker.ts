import { GlobalMetricsRegistry } from '../observability/metrics/metrics.registry';
import { Logger } from '../observability/logger/logger';
import { RequestContextService } from '../../context/request-context.service';

// ---------------------------------------------------------
// Job Context — Carries event metadata for end-to-end tracing
// ---------------------------------------------------------

export interface JobContext<T> {
  jobId: string;
  correlationId: string;
  causationId?: string;
  eventId?: string;
  occurredAt?: string;
  tenantId: string;
  payload: T;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
  priority: number;
}

// ---------------------------------------------------------
// Baku Lifecycle States
// ---------------------------------------------------------
// WAITING → STARTED → PROCESSING → SUCCESS
//                                 or FAILED → RETRY → DEADLETTER
//
// Developer fitur TIDAK BOLEH memanggil metric atau logger lifecycle secara manual.
// Seluruh instrumentation di-handle oleh BaseWorker.process().
// ---------------------------------------------------------

const workerDuration = GlobalMetricsRegistry.createHistogram(
  'worker_job_duration_seconds',
  'Job execution duration in seconds',
  [0.01, 0.05, 0.1, 0.5, 1, 5, 30],
  ['worker']
);

const workerQueueTime = GlobalMetricsRegistry.createHistogram(
  'worker_queue_time_seconds',
  'Time spent waiting in queue in seconds',
  [0.01, 0.05, 0.2, 1, 5, 30, 60],
  ['worker']
);

const workerStatusTotal = GlobalMetricsRegistry.createCounter(
  'worker_status_total',
  'Job lifecycle state transitions',
  ['worker', 'status']
);

/**
 * Enterprise Base Worker Pattern (Fully Instrumented).
 * 
 * All lifecycle logging and metrics are handled automatically.
 * Feature developers only implement the abstract methods below —
 * they must NEVER call Logger or metrics for lifecycle events.
 * 
 * Lifecycle: WAITING → STARTED → PROCESSING → SUCCESS
 *                                           or FAILED → RETRY → DEADLETTER
 */
export abstract class BaseWorker<T> {
  abstract readonly workerName: string;

  /** Validate job payload. Return false to skip without error. */
  protected abstract validate(job: JobContext<T>): Promise<boolean>;

  /** Core business logic. Throw to trigger failure path. */
  protected abstract execute(job: JobContext<T>): Promise<void>;

  /** Post-success hook (e.g., cleanup, notifications). */
  protected abstract onSuccess(job: JobContext<T>): Promise<void>;

  /** Post-failure hook (e.g., compensation, alerting). */
  protected abstract onFailure(job: JobContext<T>, error: Error): Promise<void>;

  /** Schedule retry with backoff strategy. */
  protected abstract scheduleRetry(job: JobContext<T>, error: Error): Promise<void>;

  /**
   * Main entry point — handles full lifecycle automatically.
   * Feature developers must NEVER override this method.
   */
  public async process(job: JobContext<T>): Promise<void> {
    const workerLabel = { worker: this.workerName };

    // ── WAITING ──
    // Record how long the job waited in queue before being picked up
    const queueTimeMs = Date.now() - job.createdAt;
    const queueTimeSeconds = queueTimeMs / 1000;
    workerQueueTime.observe(queueTimeSeconds, workerLabel);
    workerStatusTotal.inc({ ...workerLabel, status: 'WAITING' });

    Logger.debug({
      lifecycle: 'WAITING',
      worker: this.workerName,
      jobId: job.jobId,
      queueTimeMs,
    });

    // ── Establish distributed tracing context ──
    return RequestContextService.run({
      correlationId: job.correlationId,
      requestId: job.jobId,
      identity: { tenantId: job.tenantId },
    }, async () => {
      const startTime = process.hrtime();

      // ── STARTED ──
      workerStatusTotal.inc({ ...workerLabel, status: 'STARTED' });
      Logger.info({
        lifecycle: 'STARTED',
        worker: this.workerName,
        jobId: job.jobId,
        causationId: job.causationId,
        eventId: job.eventId,
        retryCount: job.retryCount,
      });

      try {
        // Validation gate
        const isValid = await this.validate(job);
        if (!isValid) {
          workerStatusTotal.inc({ ...workerLabel, status: 'SKIPPED' });
          Logger.info({ lifecycle: 'SKIPPED', worker: this.workerName, jobId: job.jobId });
          return;
        }

        // ── PROCESSING ──
        workerStatusTotal.inc({ ...workerLabel, status: 'PROCESSING' });
        Logger.debug({ lifecycle: 'PROCESSING', worker: this.workerName, jobId: job.jobId });

        await this.execute(job);
        await this.onSuccess(job);

        // ── SUCCESS ──
        workerStatusTotal.inc({ ...workerLabel, status: 'SUCCESS' });
        Logger.info({ lifecycle: 'SUCCESS', worker: this.workerName, jobId: job.jobId });

      } catch (error: any) {
        // ── FAILED ──
        workerStatusTotal.inc({ ...workerLabel, status: 'FAILED' });
        Logger.error({
          lifecycle: 'FAILED',
          worker: this.workerName,
          jobId: job.jobId,
          error: error.message,
          stack: error.stack,
        });

        await this.onFailure(job, error);

        if (job.retryCount < job.maxRetries) {
          // ── RETRY ──
          workerStatusTotal.inc({ ...workerLabel, status: 'RETRY' });
          Logger.warn({
            lifecycle: 'RETRY',
            worker: this.workerName,
            jobId: job.jobId,
            retryCount: job.retryCount + 1,
            maxRetries: job.maxRetries,
          });
          await this.scheduleRetry(job, error);
        } else {
          // ── DEADLETTER ──
          workerStatusTotal.inc({ ...workerLabel, status: 'DEADLETTER' });
          Logger.fatal({
            lifecycle: 'DEADLETTER',
            worker: this.workerName,
            jobId: job.jobId,
            reason: error.message,
            totalAttempts: job.retryCount + 1,
          });
        }
      } finally {
        const diff = process.hrtime(startTime);
        const durationSeconds = diff[0] + diff[1] * 1e-9;
        workerDuration.observe(durationSeconds, workerLabel);
      }
    });
  }
}
