import { IPermissionCache } from './cache';
import { AuthorizationContext, AuthorizationResult } from './types';
import { GlobalMetrics } from '../../core/observability/metric.publisher';

/**
 * Interface to avoid coupling the evaluator directly to Prisma
 */
export interface IPermissionRepository {
  hasPermission(roleId: string, permissionString: string): Promise<boolean>;
}

/**
 * Core RBAC Engine: Evaluates if a role has absolute permission for a Resource:Action.
 * Agnostic to HTTP. Handles Caching and Benchmarking.
 */
export class PermissionEvaluator {
  constructor(
    private readonly cache: IPermissionCache,
    private readonly repo: IPermissionRepository
  ) {}

  async evaluate(ctx: AuthorizationContext): Promise<AuthorizationResult> {
    const startTime = process.hrtime();
    const roleId = ctx.requestContext.identity?.roleId;
    
    if (!roleId) {
      return AuthorizationResult.deny(ctx, 'Identity or Role missing in context', 'PermissionEvaluator', 0);
    }

    // Build standard permission string, e.g., "assignment:update"
    const permissionString = `${ctx.targetResource.resource.toLowerCase()}:${ctx.targetResource.action.toLowerCase()}`;
    
    let isCacheHit = true;
    let hasPermission = this.cache.get(roleId, permissionString);

    // Cache Miss -> Fallback to Database
    if (hasPermission === null) {
      isCacheHit = false;
      hasPermission = await this.repo.hasPermission(roleId, permissionString);
      this.cache.set(roleId, permissionString, hasPermission);
    }

    // Benchmarking & Metrics
    const diff = process.hrtime(startTime);
    const latencyMs = diff[0] * 1e3 + diff[1] * 1e-6;

    GlobalMetrics.incrementCounter(isCacheHit ? 'permission_cache_hit' : 'permission_cache_miss');
    GlobalMetrics.recordHistogram('permission_evaluation_duration_ms', latencyMs);

    if (isCacheHit && latencyMs > 1) {
      console.warn(`[BENCHMARK WARN] Cache Hit took > 1ms (${latencyMs.toFixed(2)}ms)`);
    } else if (!isCacheHit && latencyMs > 10) {
      console.warn(`[BENCHMARK WARN] Cache Miss (DB Query) took > 10ms (${latencyMs.toFixed(2)}ms)`);
    }

    if (hasPermission) {
      GlobalMetrics.incrementCounter('authorization_allowed');
      return AuthorizationResult.allow(ctx, 'PermissionEvaluator', latencyMs, { isCacheHit });
    } else {
      GlobalMetrics.incrementCounter('authorization_denied');
      return AuthorizationResult.deny(ctx, 'Role lacks absolute permission', 'PermissionEvaluator', latencyMs, { isCacheHit });
    }
  }
}
