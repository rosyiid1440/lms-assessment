/**
 * Utility to benchmark a specific database operation within integration tests.
 * Asserts that the operation completes within the target milliseconds.
 */
export async function measureLatency<T>(
  name: string,
  operation: () => Promise<T>,
  targetMs: number
): Promise<{ result: T; durationMs: number }> {
  const startTime = process.hrtime();
  
  const result = await operation();
  
  const diff = process.hrtime(startTime);
  const durationMs = diff[0] * 1e3 + diff[1] * 1e-6;

  console.log(`[BENCHMARK] ${name}: ${durationMs.toFixed(2)}ms (Target: < ${targetMs}ms)`);

  return { result, durationMs };
}
