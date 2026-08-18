import { Request, Response, NextFunction } from 'express';
import { RequestContextService } from '../context/request-context.service';
import { SessionInvalidException } from '../exceptions/security.exception';
import { GlobalMetrics } from '../observability/metric.publisher';
import { ISessionRepository } from '../../modules/auth/repository.interface';

/**
 * Factory to inject SessionRepository without breaking middleware signature.
 */
export const createSessionValidationMiddleware = (sessionRepo: ISessionRepository) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = process.hrtime();
    const identity = RequestContextService.getIdentity();

    if (!identity || !identity.sessionId) {
      return next(new SessionInvalidException('No session identity found in context'));
    }

    try {
      const session = await sessionRepo.findSessionById(identity.sessionId);

      // 1. Validate Session Exists
      if (!session) {
        throw new SessionInvalidException('Session does not exist');
      }

      // 2. Validate Not Revoked (Logged out or force kicked)
      if (session.revokedAt !== null) {
        throw new SessionInvalidException('Session has been revoked');
      }

      // 3. User & Tenant consistency check
      if (session.userId !== identity.userId || session.tenantId !== identity.tenantId) {
        throw new SessionInvalidException('Session metadata mismatch');
      }

      // (Optional async) Update Last Activity (can be debounced or handled via events to avoid DB write on every request)
      // await sessionRepo.updateSessionActivity(session.id, new Date());

      // Context Builder (Appending trusted data if needed, e.g., device trust level)
      // RequestContextService.setIdentity({ ...identity, isTrustedDevice: session.isTrustedDevice });

      const diff = process.hrtime(startTime);
      GlobalMetrics.recordHistogram('session_validation_duration_ms', diff[0] * 1e3 + diff[1] * 1e-6);

      next();
    } catch (error) {
      GlobalMetrics.incrementCounter('session_validation_failures');
      next(error);
    }
  };
};
