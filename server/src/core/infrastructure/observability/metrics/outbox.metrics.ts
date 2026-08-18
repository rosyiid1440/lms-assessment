import { PrismaClient } from '@prisma/client';
import { GlobalMetricsRegistry } from './metrics.registry';
import { Logger } from '../logger/logger';

// ---------------------------------------------------------
// Outbox Gauges (All collected by a single scheduler)
// ---------------------------------------------------------

const outboxPendingGauge = GlobalMetricsRegistry.createGauge(
  'outbox_pending_total',
  'Total pending events in outbox'
);

const outboxLockedGauge = GlobalMetricsRegistry.createGauge(
  'outbox_locked_total',
  'Total currently locked (in-flight) events in outbox'
);

const outboxDeadletterGauge = GlobalMetricsRegistry.createGauge(
  'outbox_deadletter_total',
  'Total dead-lettered events in outbox'
);

const outboxOldestAgeGauge = GlobalMetricsRegistry.createGauge(
  'outbox_oldest_pending_seconds',
  'Age of the oldest pending event in seconds (primary health indicator)'
);

// ---------------------------------------------------------
// Warning Escalation Thresholds
// ---------------------------------------------------------
const ESCALATION = {
  WARN: 60,    // > 60 seconds → WARN
  ERROR: 300,  // > 300 seconds (5 min) → ERROR
  FATAL: 900,  // > 900 seconds (15 min) → FATAL
} as const;

/**
 * Outbox Metrics Collector.
 * 
 * Uses ONE scheduler + ONE aggregated query to minimize DB overhead.
 * Runs every 15 seconds to match Prometheus scrape interval.
 * 
 * Warning Escalation:
 *   WARN  → oldest pending > 60s
 *   ERROR → oldest pending > 300s
 *   FATAL → oldest pending > 900s
 */
export class OutboxMetricsCollector {
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaClient) {}

  start(intervalMs = 15000): void {
    this.timer = setInterval(() => this.collect(), intervalMs);
    Logger.info({ component: 'OutboxMetricsCollector', intervalMs }, 'Outbox metrics collector started');
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Single aggregated query — avoids multiple round-trips to PostgreSQL.
   * Returns status counts + oldest pending age in one shot.
   */
  private async collect(): Promise<void> {
    try {
      // Single query: aggregate counts by status + oldest pending age
      const result = await this.prisma.$queryRaw<Array<{
        status: string;
        count: bigint;
        oldest_age_seconds: number | null;
      }>>`
        SELECT 
          status,
          COUNT(*)::bigint AS count,
          CASE 
            WHEN status = 'PENDING' THEN
              EXTRACT(EPOCH FROM (NOW() - MIN(
                CASE WHEN "availableAt" <= NOW() THEN "availableAt" END
              )))
            ELSE NULL
          END AS oldest_age_seconds
        FROM outbox_events
        WHERE status IN ('PENDING', 'PROCESSING', 'DEAD_LETTER')
        GROUP BY status
      `;

      // Reset gauges to 0 (handles case where a status group disappears)
      let pendingCount = 0;
      let lockedCount = 0;
      let deadletterCount = 0;
      let oldestAgeSeconds = 0;

      for (const row of result) {
        const count = Number(row.count);

        switch (row.status) {
          case 'PENDING':
            pendingCount = count;
            oldestAgeSeconds = Math.max(0, Math.floor(row.oldest_age_seconds ?? 0));
            break;
          case 'PROCESSING':
            lockedCount = count;
            break;
          case 'DEAD_LETTER':
            deadletterCount = count;
            break;
        }
      }

      // Set all gauges
      outboxPendingGauge.set(pendingCount);
      outboxLockedGauge.set(lockedCount);
      outboxDeadletterGauge.set(deadletterCount);
      outboxOldestAgeGauge.set(oldestAgeSeconds);

      // Warning Escalation (integrates with Alertmanager / PagerDuty via log level)
      if (oldestAgeSeconds > ESCALATION.FATAL) {
        Logger.fatal({
          type: 'OUTBOX_STUCK',
          oldestAgeSeconds,
          pendingCount,
          lockedCount,
          deadletterCount,
          escalation: 'FATAL',
        }, 'Outbox critically stuck — pipeline may be down');
      } else if (oldestAgeSeconds > ESCALATION.ERROR) {
        Logger.error({
          type: 'OUTBOX_STUCK',
          oldestAgeSeconds,
          pendingCount,
          lockedCount,
          escalation: 'ERROR',
        }, 'Outbox processing severely delayed');
      } else if (oldestAgeSeconds > ESCALATION.WARN) {
        Logger.warn({
          type: 'OUTBOX_STUCK',
          oldestAgeSeconds,
          pendingCount,
          escalation: 'WARN',
        }, 'Outbox processing delayed');
      }

    } catch (error: any) {
      Logger.error({ component: 'OutboxMetricsCollector', error: error.message }, 'Failed to collect outbox metrics');
    }
  }
}
