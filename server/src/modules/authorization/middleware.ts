import { Request, Response, NextFunction } from 'express';
import { AuthorizationService } from './service';
import { RequestContextService } from '../../core/context/request-context.service';
import { AuthorizationContext, AuthorizationResource } from './types';
import { BaseException } from '../../core/exceptions/security.exception';

// Custom Exceptions
export class PermissionDeniedException extends BaseException {
  constructor(message = 'Insufficient absolute permissions') {
    super(message, 403, 'PERMISSION_DENIED');
  }
}

export class OwnershipDeniedException extends BaseException {
  constructor(message = 'Insufficient contextual or ownership policies') {
    super(message, 403, 'OWNERSHIP_DENIED');
  }
}

/**
 * Helper to build Context from Express Request
 */
const buildAuthZContext = (req: Request, resource: string, action: string, resourceId?: string): AuthorizationContext => {
  const requestContext = RequestContextService.getContext();
  
  const targetResource: AuthorizationResource = {
    resource,
    action,
    attributes: {
      ipAddress: req.ip,
      // Future ABAC attributes extraction (time, geo, etc.)
    }
  };

  return { requestContext, targetResource, resourceId };
};

/**
 * Adapter: Permission Middleware (RBAC)
 */
export const requirePermission = (authZService: AuthorizationService, resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = buildAuthZContext(req, resource, action);
      const result = await authZService.checkPermission(ctx);

      if (!result.allowed) {
        throw new PermissionDeniedException(`Missing permission for ${resource}:${action}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Adapter: Ownership/Policy Middleware
 * Usually stacked AFTER requirePermission if RBAC failed, or used exclusively for strict ownership.
 */
export const requirePolicy = (authZService: AuthorizationService, resource: string, action: string, resourceIdParam = 'id') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract resource ID from params (e.g., /assignments/:id)
      const resourceId = req.params[resourceIdParam];
      const ctx = buildAuthZContext(req, resource, action, resourceId);
      
      const result = await authZService.checkPolicy(ctx);

      if (!result.allowed) {
        throw new OwnershipDeniedException(`Policy denied access to ${resource} ${resourceId || ''}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
