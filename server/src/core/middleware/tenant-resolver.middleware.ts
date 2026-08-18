import { Request, Response, NextFunction } from 'express';
import { ITenantResolver } from '../../modules/tenant/tenant-resolver.strategy';
import { RequestContextService } from '../context/request-context.service';
import { TenantMismatchException, TenantInactiveException, BaseException } from '../exceptions/security.exception';
import { GlobalMetrics } from '../observability/metric.publisher';

interface ITenantValidationService {
  isTenantActive(tenantId: string): Promise<boolean>;
}

/**
 * Validates and injects the accurate Tenant ID.
 * Supports configurable resolution strategy (Header, Subdomain, JWT).
 */
export const createTenantResolverMiddleware = (
  strategy: ITenantResolver,
  tenantValidationService: ITenantValidationService
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = process.hrtime();

    try {
      // 1. Resolve Tenant ID using the configured strategy
      const resolvedTenantId = strategy.resolve(req);

      if (!resolvedTenantId) {
        throw new TenantMismatchException('Unable to resolve tenant from request');
      }

      // 2. Cross-check against Authenticated Context (if logged in)
      const identity = RequestContextService.getIdentity();
      if (identity && identity.tenantId && identity.tenantId !== resolvedTenantId) {
        // SECURITY BREACH ATTEMPT: User's token belongs to Tenant A, but they try to access Tenant B
        throw new TenantMismatchException('Cross-tenant data access is strictly forbidden');
      }

      // 3. Database Validation (Is Tenant Active?)
      const isActive = await tenantValidationService.isTenantActive(resolvedTenantId);
      if (!isActive) {
        throw new TenantInactiveException(`Tenant ${resolvedTenantId} is suspended or inactive`);
      }

      // 4. Update Context Builder (if public route, identity might be empty)
      RequestContextService.setIdentity({ tenantId: resolvedTenantId });

      const diff = process.hrtime(startTime);
      GlobalMetrics.recordHistogram('tenant_resolution_duration_ms', diff[0] * 1e3 + diff[1] * 1e-6);

      next();
    } catch (error) {
      GlobalMetrics.incrementCounter('tenant_resolution_failures');
      next(error);
    }
  };
};
