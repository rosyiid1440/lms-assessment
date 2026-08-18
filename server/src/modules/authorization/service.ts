import { AuthorizationContext, AuthorizationResult } from './types';
import { PermissionEvaluator } from './evaluator';
import { PolicyRegistry } from './registry';
import { IAuthorizationLogger } from './logger';
import { GlobalMetrics } from '../../core/observability/metric.publisher';

/**
 * Strategy to decouple Super Admin bypass logic.
 */
export interface ISuperAdminStrategy {
  isSuperAdmin(ctx: AuthorizationContext): Promise<boolean>;
}

/**
 * Default Strategy: Check if role name/ID matches Super Admin context.
 */
export class DefaultSuperAdminStrategy implements ISuperAdminStrategy {
  async isSuperAdmin(ctx: AuthorizationContext): Promise<boolean> {
    // In reality, compare against a cached configuration or specific Role ID
    return ctx.requestContext.identity?.roleId === 'SUPER_ADMIN_ROLE_ID';
  }
}

/**
 * Facade for the Authorization Domain.
 * The only point of interaction for Middlewares/Adapters.
 */
export class AuthorizationService {
  constructor(
    private readonly evaluator: PermissionEvaluator,
    private readonly superAdminStrategy: ISuperAdminStrategy,
    private readonly logger: IAuthorizationLogger
  ) {}

  /**
   * Checks Absolute Permission (RBAC)
   */
  async checkPermission(ctx: AuthorizationContext): Promise<AuthorizationResult> {
    const startTime = process.hrtime();
    let result: AuthorizationResult;

    // 1. Super Admin Bypass
    if (await this.superAdminStrategy.isSuperAdmin(ctx)) {
      result = AuthorizationResult.allow(ctx, 'SuperAdminBypass', this.getLatency(startTime), { bypass: true });
    } else {
      // 2. Standard RBAC Evaluation
      result = await this.evaluator.evaluate(ctx);
    }

    this.logger.logDecision(result, ctx);
    return result;
  }

  /**
   * Checks Contextual Policy (Ownership / ABAC)
   */
  async checkPolicy(ctx: AuthorizationContext): Promise<AuthorizationResult> {
    const startTime = process.hrtime();
    let result: AuthorizationResult;

    // 1. Super Admin Bypass
    if (await this.superAdminStrategy.isSuperAdmin(ctx)) {
      result = AuthorizationResult.allow(ctx, 'SuperAdminBypass', this.getLatency(startTime), { bypass: true });
    } else {
      // 2. Fetch Policy from Registry
      const policy = PolicyRegistry.getPolicy(ctx.targetResource.resource);
      
      if (!policy) {
        // Fail-closed mechanism: If a policy check is requested but no policy exists, Deny.
        result = AuthorizationResult.deny(ctx, `No policy registered for resource: ${ctx.targetResource.resource}`, 'FailClosed', this.getLatency(startTime));
      } else {
        // 3. Evaluate Policy
        result = await policy.evaluate(ctx);
      }
    }

    this.logger.logDecision(result, ctx);
    return result;
  }

  private getLatency(startTime: [number, number]): number {
    const diff = process.hrtime(startTime);
    return diff[0] * 1e3 + diff[1] * 1e-6;
  }
}
