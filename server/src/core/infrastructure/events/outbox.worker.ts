import { PrismaClient } from '@prisma/client';
import { IEventBus } from './event-bus';
import { toEventEnvelope } from './event-envelope';
import { GlobalMetricsRegistry } from '../observability/metrics/metrics.registry';
import { Logger } from '../observability/logger/logger';
import { RequestContextService } from '../../context/request-context.service';

// ---------------------------------------------------------
// Outbox Worker Metrics (separate from OutboxMetricsCollector gauges)
// ---------------------------------------------------------

const outboxProcessedTotal = GlobalMetricsRegistry.createCounter(
  'outbox_events_processed_total',
  'Total outbox events processed by status',
  ['status'] // PUBLISHED | FAILED | DEAD_LETTER
);

const outboxProcessingDuration = GlobalMetricsRegistry.createHistogram(
  'outbox_event_processing_duration_seconds',
  'Time to process a single outbox event',
  [0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  [] // No labels — one histogram for all events
);

/**
 * Outbox Worker — Transactional Outbox Pattern.
 * 
 * Polls outbox_events with FOR UPDATE SKIP LOCKED for exactly-once delivery.
 * Uses exponential backoff for retries and dead-letters permanently failed events.
 * 
 * Full correlation context is propagated from event metadata:
 *   HTTP → Outbox → Worker → Notification → Email
 */
export class OutboxWorker {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private readonly MAX_RETRIES = 5;
  private readonly BATCH_SIZE = 50;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: IEventBus,
  ) {}

  start(intervalMs = 2000): void {
    this.isRunning = true;
    Logger.info({ component: 'OutboxWorker', intervalMs }, 'Outbox worker started');

    this.timer = setInterval(() => {
      if (this.isRunning) {
        this.processOutbox().catch(err =>
          Logger.error({ component: 'OutboxWorker', error: err.message, stack: err.stack }, 'Outbox polling fatal error')
        );
      }
    }, intervalMs);
  }

  stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    Logger.info({ component: 'OutboxWorker' }, 'Outbox worker stopped');
  }

  private async processOutbox(): Promise<void> {
    // 1. Atomically fetch and lock a batch using Postgres FOR UPDATE SKIP LOCKED
    const lockedEvents = await this.prisma.$queryRaw<Array<{
      id: string;
      eventType: string;
      payload: any;
      attemptCount: number;
    }>>`
      UPDATE outbox_events
      SET 
        status = 'PROCESSING',
        "lockedUntil" = NOW() + INTERVAL '30 seconds'
      WHERE id IN (
        SELECT id FROM outbox_events
        WHERE 
          (status = 'PENDING' OR status = 'FAILED') 
          AND "availableAt" <= NOW()
          AND ("lockedUntil" IS NULL OR "lockedUntil" <= NOW())
        ORDER BY "createdAt" ASC
        LIMIT ${this.BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, "eventType", "payload", "attemptCount";
    `;

    if (lockedEvents.length === 0) return;

    Logger.debug({
      component: 'OutboxWorker',
      batchSize: lockedEvents.length,
    }, `Processing ${lockedEvents.length} outbox events`);

    // 2. Process each event with full correlation context
    for (const event of lockedEvents) {
      const startTime = process.hrtime();

      try {
        // Normalize domain event to canonical EventEnvelope
        const envelope = toEventEnvelope(event.payload as Record<string, any>);

        // Establish distributed tracing context for this event
        await RequestContextService.run({
          correlationId: envelope.correlationId || event.id,
          requestId: envelope.eventId || event.id,
          identity: { tenantId: envelope.tenantId },
        }, async () => {
          await this.eventBus.publish(envelope);
        });

        // Success: Mark as PUBLISHED
        await this.prisma.$executeRaw`
          UPDATE outbox_events 
          SET status = 'PUBLISHED', "publishedAt" = NOW(), "lockedUntil" = NULL, "processedAt" = NOW()
          WHERE id = ${event.id}::uuid;
        `;

        outboxProcessedTotal.inc({ status: 'PUBLISHED' });

        const diff = process.hrtime(startTime);
        outboxProcessingDuration.observe(diff[0] + diff[1] * 1e-9);

      } catch (error: any) {
        const nextAttempt = event.attemptCount + 1;

        if (nextAttempt >= this.MAX_RETRIES) {
          // Dead Letter
          await this.prisma.$executeRaw`
            UPDATE outbox_events 
            SET status = 'DEAD_LETTER', "lastError" = ${error.message}, "lockedUntil" = NULL
            WHERE id = ${event.id}::uuid;
          `;
          outboxProcessedTotal.inc({ status: 'DEAD_LETTER' });

          Logger.error({
            component: 'OutboxWorker',
            eventId: event.id,
            eventType: event.eventType,
            attempts: nextAttempt,
            error: error.message,
          }, 'Event moved to dead letter queue');

        } else {
          // Exponential Backoff: (2^attempt) * 5 seconds
          const delaySeconds = Math.pow(2, nextAttempt) * 5;

          await this.prisma.$executeRaw`
            UPDATE outbox_events 
            SET 
              status = 'FAILED', 
              "attemptCount" = ${nextAttempt}, 
              "lastError" = ${error.message},
              "availableAt" = NOW() + (${delaySeconds} * INTERVAL '1 second'),
              "lockedUntil" = NULL
            WHERE id = ${event.id}::uuid;
          `;

          Logger.warn({
            component: 'OutboxWorker',
            eventId: event.id,
            eventType: event.eventType,
            retryIn: `${delaySeconds}s`,
            attempt: nextAttempt,
          }, 'Event processing failed, scheduling retry');
        }

        outboxProcessedTotal.inc({ status: 'FAILED' });
      }
    }
  }
}
