import { AuthorizationContext, AuthorizationResult } from './types';
import { GlobalMetrics } from '../../core/observability/metric.publisher';

/**
 * Standard interface for all Policies.
 */
export interface IPolicy {
  evaluate(ctx: AuthorizationContext): Promise<AuthorizationResult>;
}

/**
 * Composite Policy: Logical AND
 * Allows if ALL child policies allow.
 */
export class AllPolicy implements IPolicy {
  constructor(public readonly name: string, private readonly policies: IPolicy[]) {}

  async evaluate(ctx: AuthorizationContext): Promise<AuthorizationResult> {
    const startTime = process.hrtime();

    for (const policy of this.policies) {
      const result = await policy.evaluate(ctx);
      if (!result.allowed) {
        // Fail Fast
        const latencyMs = (process.hrtime(startTime)[0] * 1e3 + process.hrtime(startTime)[1] * 1e-6);
        return AuthorizationResult.deny(ctx, `Failed at ${result.policyName}: ${result.reason}`, this.name, latencyMs);
      }
    }

    const latencyMs = (process.hrtime(startTime)[0] * 1e3 + process.hrtime(startTime)[1] * 1e-6);
    this.benchmark(latencyMs);
    return AuthorizationResult.allow(ctx, this.name, latencyMs);
  }

  private benchmark(latencyMs: number) {
    GlobalMetrics.recordHistogram('policy_execution_duration_ms', latencyMs);
    if (latencyMs > 50) {
      console.warn(`[BENCHMARK WARN] Ownership/Composite Policy execution took > 50ms (${latencyMs.toFixed(2)}ms)`);
    }
  }
}

/**
 * Composite Policy: Logical OR
 * Allows if AT LEAST ONE child policy allows.
 */
export class AnyPolicy implements IPolicy {
  constructor(public readonly name: string, private readonly policies: IPolicy[]) {}

  async evaluate(ctx: AuthorizationContext): Promise<AuthorizationResult> {
    const startTime = process.hrtime();
    let reasons: string[] = [];

    for (const policy of this.policies) {
      const result = await policy.evaluate(ctx);
      if (result.allowed) {
        const latencyMs = (process.hrtime(startTime)[0] * 1e3 + process.hrtime(startTime)[1] * 1e-6);
        this.benchmark(latencyMs);
        return AuthorizationResult.allow(ctx, this.name, latencyMs, { allowedBy: result.policyName });
      }
      reasons.push(`${result.policyName}: ${result.reason}`);
    }

    const latencyMs = (process.hrtime(startTime)[0] * 1e3 + process.hrtime(startTime)[1] * 1e-6);
    return AuthorizationResult.deny(ctx, `All policies failed: ${reasons.join(', ')}`, this.name, latencyMs);
  }

  private benchmark(latencyMs: number) {
    GlobalMetrics.recordHistogram('policy_execution_duration_ms', latencyMs);
  }
}
