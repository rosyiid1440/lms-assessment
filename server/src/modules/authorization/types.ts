import { IRequestContext } from '../../core/context/request-context.service';

/**
 * Standardized Resource-Action model (ABAC Ready)
 */
export interface AuthorizationResource {
  resource: string; // e.g., 'Assignment'
  action: string;   // e.g., 'update'
  attributes?: Record<string, any>; // Future ABAC (time, location, device)
}

export interface AuthorizationContext {
  requestContext: IRequestContext;
  targetResource: AuthorizationResource;
  resourceId?: string;
}

/**
 * Standardized output for every Authorization decision.
 */
export class AuthorizationResult {
  constructor(
    public readonly allowed: boolean,
    public readonly reason: string,
    public readonly resource: string,
    public readonly action: string,
    public readonly policyName: string,
    public readonly executionTimeMs: number,
    public readonly metadata?: any
  ) {}

  static allow(ctx: AuthorizationContext, policyName: string, timeMs: number, metadata?: any): AuthorizationResult {
    return new AuthorizationResult(true, 'Access Granted', ctx.targetResource.resource, ctx.targetResource.action, policyName, timeMs, metadata);
  }

  static deny(ctx: AuthorizationContext, reason: string, policyName: string, timeMs: number, metadata?: any): AuthorizationResult {
    return new AuthorizationResult(false, reason, ctx.targetResource.resource, ctx.targetResource.action, policyName, timeMs, metadata);
  }
}
