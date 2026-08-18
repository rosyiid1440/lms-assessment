import client from 'prom-client';
import { Logger } from '../logger/logger';

// ---------------------------------------------------------
// ABSTRACTION INTERFACES (OpenTelemetry Ready)
// ---------------------------------------------------------
export interface ICounter {
  inc(labels?: Record<string, string>, value?: number): void;
}

export interface IHistogram {
  observe(value: number, labels?: Record<string, string>): void;
}

export interface IGauge {
  set(value: number, labels?: Record<string, string>): void;
  inc(labels?: Record<string, string>, value?: number): void;
  dec(labels?: Record<string, string>, value?: number): void;
}

export interface IMetricsRegistry {
  createCounter(name: string, help: string, labelNames?: string[]): ICounter;
  createHistogram(name: string, help: string, buckets?: number[], labelNames?: string[]): IHistogram;
  createGauge(name: string, help: string, labelNames?: string[]): IGauge;
  getMetrics(): Promise<string>;
}

// ---------------------------------------------------------
// PROMETHEUS IMPLEMENTATION
// ---------------------------------------------------------
export class PrometheusMetricsRegistry implements IMetricsRegistry {
  private readonly defaultBuckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
  
  // Guard against high cardinality fields
  private readonly FORBIDDEN_LABELS = ['userId', 'email', 'courseId', 'assignmentId', 'studentId', 'questionId'];

  constructor() {
    // Enable default NodeJS metrics (Heap, Event Loop Delay, Active Requests)
    client.collectDefaultMetrics({ prefix: 'lms_' });
  }

  private validateLabels(labelNames?: string[]) {
    if (!labelNames) return;
    const forbidden = labelNames.filter(l => this.FORBIDDEN_LABELS.includes(l));
    if (forbidden.length > 0) {
      Logger.fatal(`[METRICS CARDINALITY VIOLATION] Attempted to register high cardinality labels: ${forbidden.join(', ')}`);
      throw new Error('Metrics Cardinality Violation. Do not use unbound IDs as labels.');
    }
  }

  createCounter(name: string, help: string, labelNames?: string[]): ICounter {
    this.validateLabels(labelNames);
    const counter = new client.Counter({ name: `lms_${name}`, help, labelNames });
    return {
      inc: (labels, value = 1) => counter.inc(labels || {}, value)
    };
  }

  createHistogram(name: string, help: string, buckets = this.defaultBuckets, labelNames?: string[]): IHistogram {
    this.validateLabels(labelNames);
    const histogram = new client.Histogram({ name: `lms_${name}`, help, labelNames, buckets });
    return {
      observe: (value, labels) => histogram.observe(labels || {}, value)
    };
  }

  createGauge(name: string, help: string, labelNames?: string[]): IGauge {
    this.validateLabels(labelNames);
    const gauge = new client.Gauge({ name: `lms_${name}`, help, labelNames });
    return {
      set: (value, labels) => gauge.set(labels || {}, value),
      inc: (labels, value = 1) => gauge.inc(labels || {}, value),
      dec: (labels, value = 1) => gauge.dec(labels || {}, value),
    };
  }

  async getMetrics(): Promise<string> {
    return client.register.metrics();
  }
}

// Singleton Instance
export const GlobalMetricsRegistry = new PrometheusMetricsRegistry();
