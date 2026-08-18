import { ICache } from './cache.interface';
import { GlobalMetricsRegistry } from '../observability/metrics/metrics.registry';

// ---------------------------------------------------------
// Cache Metrics
// ---------------------------------------------------------

const cacheOpsTotal = GlobalMetricsRegistry.createCounter(
  'cache_operations_total',
  'Total cache operations',
  ['operation', 'status'] // operation: GET, SET, DELETE, INVALIDATE_TAG, WARMUP; status: HIT, MISS, SUCCESS, FAILED
);

const cacheLatency = GlobalMetricsRegistry.createHistogram(
  'cache_latency_seconds',
  'Cache operation latency in seconds (useful for tracking Redis latency)',
  [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
  ['operation']
);

/**
 * Decorator pattern to instrument any ICache implementation (Memory, Redis, etc.)
 * Provides metrics for Hits, Misses, Invalidation, and Latency without polluting
 * the core cache logic.
 */
export class InstrumentedCacheProvider<TValue> implements ICache<TValue> {
  constructor(private readonly delegate: ICache<TValue>) {}

  async get(key: string): Promise<TValue | null> {
    const start = process.hrtime();
    try {
      const result = await this.delegate.get(key);
      const diff = process.hrtime(start);
      cacheLatency.observe(diff[0] + diff[1] * 1e-9, { operation: 'GET' });
      
      if (result !== null) {
        cacheOpsTotal.inc({ operation: 'GET', status: 'HIT' });
      } else {
        cacheOpsTotal.inc({ operation: 'GET', status: 'MISS' });
      }
      return result;
    } catch (error) {
      cacheOpsTotal.inc({ operation: 'GET', status: 'FAILED' });
      throw error;
    }
  }

  async set(key: string, value: TValue, ttlMs?: number, tags?: string[]): Promise<void> {
    const start = process.hrtime();
    try {
      await this.delegate.set(key, value, ttlMs, tags);
      const diff = process.hrtime(start);
      cacheLatency.observe(diff[0] + diff[1] * 1e-9, { operation: 'SET' });
      cacheOpsTotal.inc({ operation: 'SET', status: 'SUCCESS' });
    } catch (error) {
      cacheOpsTotal.inc({ operation: 'SET', status: 'FAILED' });
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const start = process.hrtime();
    try {
      await this.delegate.delete(key);
      const diff = process.hrtime(start);
      cacheLatency.observe(diff[0] + diff[1] * 1e-9, { operation: 'DELETE' });
      cacheOpsTotal.inc({ operation: 'DELETE', status: 'SUCCESS' });
    } catch (error) {
      cacheOpsTotal.inc({ operation: 'DELETE', status: 'FAILED' });
      throw error;
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    const start = process.hrtime();
    try {
      await this.delegate.invalidateByTag(tag);
      const diff = process.hrtime(start);
      cacheLatency.observe(diff[0] + diff[1] * 1e-9, { operation: 'INVALIDATE_TAG' });
      cacheOpsTotal.inc({ operation: 'INVALIDATE_TAG', status: 'SUCCESS' });
    } catch (error) {
      cacheOpsTotal.inc({ operation: 'INVALIDATE_TAG', status: 'FAILED' });
      throw error;
    }
  }
}
