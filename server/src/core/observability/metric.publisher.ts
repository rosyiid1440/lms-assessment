/**
 * Simple abstraction for observability.
 * Ready for Prometheus / Datadog integration in the future.
 */
export interface IMetricPublisher {
  recordHistogram(metricName: string, value: number, tags?: Record<string, string>): void;
  incrementCounter(metricName: string, tags?: Record<string, string>): void;
}

// In-Memory NoOp Publisher for initial implementation
export class NoOpMetricPublisher implements IMetricPublisher {
  recordHistogram(metricName: string, value: number, tags?: Record<string, string>): void {
    // console.log(`[METRIC] ${metricName} = ${value}ms`, tags);
  }
  incrementCounter(metricName: string, tags?: Record<string, string>): void {
    // console.log(`[METRIC] ${metricName}++`, tags);
  }
}

export const GlobalMetrics = new NoOpMetricPublisher();
