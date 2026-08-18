import { PrismaClient } from '@prisma/client';
import { Logger } from '../logger/logger';
import { GlobalMetricsRegistry } from '../metrics/metrics.registry';
import { RequestContextService } from '../../../context/request-context.service';

const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.DATABASE_SLOW_QUERY_MS || '75', 10);

// ---------------------------------------------------------
// Prometheus Metrics (Strictly Bounded Labels)
// ---------------------------------------------------------

/** Total queries executed (success + error combined) */
const dbQueriesTotal = GlobalMetricsRegistry.createCounter(
  'db_queries_total',
  'Total number of database queries',
  ['model', 'operation']
);

/** Total failed queries (subset of db_queries_total) */
const dbQueryErrorsTotal = GlobalMetricsRegistry.createCounter(
  'db_query_errors_total',
  'Total number of failed database queries',
  ['model', 'operation']
);

/** Query duration histogram — Prometheus convention: seconds */
const dbQueryDuration = GlobalMetricsRegistry.createHistogram(
  'db_query_duration_seconds',
  'Database query duration in seconds',
  [0.005, 0.015, 0.05, 0.1, 0.25, 0.5, 1, 5],
  ['model', 'operation']
);

// ---------------------------------------------------------
// Prisma Extension
// ---------------------------------------------------------

/**
 * Prisma Extension to observe queries without mutating business logic.
 * 
 * Security: NEVER logs `args` (may contain passwordHash, PII).
 * Performance: < 0.1ms overhead per query via process.hrtime().
 */
export const withObservability = (prisma: PrismaClient) => {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const startTime = process.hrtime();
          let failed = false;

          try {
            const result = await query(args);
            return result;
          } catch (error) {
            failed = true;
            throw error;
          } finally {
            const diff = process.hrtime(startTime);
            const durationMs = diff[0] * 1e3 + diff[1] * 1e-6;
            const durationSeconds = durationMs / 1000;
            const labels = { model: model || 'Unknown', operation };

            // 1. Counters
            dbQueriesTotal.inc(labels);
            if (failed) {
              dbQueryErrorsTotal.inc(labels);
            }

            // 2. Histogram (seconds)
            dbQueryDuration.observe(durationSeconds, labels);

            // 3. Slow Query Logger — consistent fields for Loki/Grafana
            if (durationMs > SLOW_QUERY_THRESHOLD_MS && !failed) {
              let correlationId: string | undefined;
              let tenantId: string | undefined;
              try {
                const ctx = RequestContextService.getContext();
                correlationId = ctx.correlationId;
                tenantId = ctx.identity?.tenantId;
              } catch {
                // Outside request context (seed, migration, outbox worker)
              }

              Logger.warn({
                type: 'QUERY_SLOW',
                model,
                operation,
                durationMs: Math.round(durationMs * 100) / 100,
                correlationId,
                tenantId,
              }, 'Slow database query detected');
            }
          }
        },
      },
    },
  });
};
