import { monitorEventLoopDelay } from 'perf_hooks';

export interface BenchmarkConfig {
  name: string;
  concurrency: number;
  totalOperations: number;
  baselineP95Ms: number; // The Regression Guard Threshold
}

export interface BenchmarkResult {
  name: string;
  concurrency: number;
  totalOperations: number;
  metrics: {
    min: number;
    p50: number;
    avg: number;
    p95: number;
    p99: number;
    max: number;
    throughputSec: number;
    errorRate: number;
  };
  resources: {
    maxMemoryMb: number;
    eventLoopDelayP99Ms: number;
  };
  passed: boolean;
}

export class BenchmarkHarness {
  static async run(
    config: BenchmarkConfig, 
    operation: (index: number) => Promise<void>
  ): Promise<BenchmarkResult> {
    
    console.log(`\n⏳ Running Benchmark: ${config.name} | Concurrency: ${config.concurrency} | Total: ${config.totalOperations}`);
    
    const durations: number[] = [];
    let errors = 0;
    
    // Resource Monitor Setup
    const elMonitor = monitorEventLoopDelay({ resolution: 10 });
    elMonitor.enable();
    const initialMem = process.memoryUsage().heapUsed;

    const startTime = performance.now();

    // Concurrency Batches
    for (let i = 0; i < config.totalOperations; i += config.concurrency) {
      const batchSize = Math.min(config.concurrency, config.totalOperations - i);
      const promises = Array.from({ length: batchSize }).map(async (_, idx) => {
        const opStart = performance.now();
        try {
          await operation(i + idx);
        } catch (e) {
          errors++;
        } finally {
          durations.push(performance.now() - opStart);
        }
      });
      await Promise.all(promises);
    }

    const totalTimeMs = performance.now() - startTime;
    elMonitor.disable();

    // Math & Statistics
    durations.sort((a, b) => a - b);
    const len = durations.length;
    
    const p50 = durations[Math.floor(len * 0.50)] || 0;
    const p95 = durations[Math.floor(len * 0.95)] || 0;
    const p99 = durations[Math.floor(len * 0.99)] || 0;
    const max = durations[len - 1] || 0;
    const min = durations[0] || 0;
    const avg = durations.reduce((a, b) => a + b, 0) / (len || 1);
    
    const throughputSec = (config.totalOperations / totalTimeMs) * 1000;
    const errorRate = (errors / config.totalOperations) * 100;

    const finalMem = process.memoryUsage().heapUsed;
    const maxMemoryMb = Math.max(0, (finalMem - initialMem) / 1024 / 1024);

    // REGRESSION GUARD EVALUATION
    const passed = p95 <= config.baselineP95Ms && errorRate === 0;

    const result: BenchmarkResult = {
      name: config.name,
      concurrency: config.concurrency,
      totalOperations: config.totalOperations,
      metrics: { min, p50, avg, p95, p99, max, throughputSec, errorRate },
      resources: {
        maxMemoryMb,
        eventLoopDelayP99Ms: elMonitor.percentile(99) / 1e6 // nanoseconds to ms
      },
      passed
    };

    this.printResult(result, config.baselineP95Ms);
    return result;
  }

  private static printResult(res: BenchmarkResult, baseline: number) {
    const status = res.passed ? '✅ PASSED' : '❌ FAILED (REGRESSION DETECTED)';
    console.log(`--------------------------------------------------`);
    console.log(`${status} - ${res.name}`);
    console.log(`Target P95: <= ${baseline}ms | Actual P95: ${res.metrics.p95.toFixed(2)}ms`);
    console.log(`P50 (Median): ${res.metrics.p50.toFixed(2)}ms | P99: ${res.metrics.p99.toFixed(2)}ms | Max: ${res.metrics.max.toFixed(2)}ms`);
    console.log(`Throughput: ${res.metrics.throughputSec.toFixed(2)} ops/sec`);
    console.log(`Event Loop Delay (P99): ${res.resources.eventLoopDelayP99Ms.toFixed(2)}ms`);
    console.log(`--------------------------------------------------`);
  }
}
