import { Request } from 'express';
import { RequestContextService } from '../../core/context/request-context.service';

/**
 * Strategy Interface
 */
export interface ITenantResolver {
  resolve(req: Request): string | null;
}

export class HeaderTenantResolver implements ITenantResolver {
  resolve(req: Request): string | null {
    return (req.headers['x-tenant-id'] as string) || null;
  }
}

export class SubdomainTenantResolver implements ITenantResolver {
  resolve(req: Request): string | null {
    // Example: school-a.lms.com -> school-a
    const host = req.hostname;
    const parts = host.split('.');
    if (parts.length >= 3) {
      return parts[0];
    }
    return null;
  }
}

export class JwtTenantResolver implements ITenantResolver {
  resolve(req: Request): string | null {
    // The JWT tenant is already extracted into context by AuthenticationMiddleware
    const identity = RequestContextService.getIdentity();
    return identity?.tenantId || null;
  }
}

/**
 * Registry & Factory for Tenant Strategies
 */
export class TenantResolverRegistry {
  private static strategies = new Map<string, ITenantResolver>();

  static register(name: string, resolver: ITenantResolver) {
    this.strategies.set(name, resolver);
  }

  static get(name: string): ITenantResolver {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      throw new Error(`Tenant resolver strategy '${name}' not found.`);
    }
    return strategy;
  }
}

// Pre-registering default strategies
TenantResolverRegistry.register('jwt', new JwtTenantResolver());
TenantResolverRegistry.register('header', new HeaderTenantResolver());
TenantResolverRegistry.register('subdomain', new SubdomainTenantResolver());
