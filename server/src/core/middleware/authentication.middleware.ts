import { Request, Response, NextFunction } from 'express';
import { JwtUtil } from '../../shared/utils/jwt.util';
import { RequestContextService } from '../context/request-context.service';
import { AuthenticationRequiredException } from '../exceptions/security.exception';
import { GlobalMetrics } from '../observability/metric.publisher';

/**
 * PURE AUTHENTICATION:
 * 1. Reads Bearer Token or AccessCookie
 * 2. Cryptographically verifies JWT
 * 3. Builds Identity Context
 * NO DATABASE QUERIES ALLOWED HERE.
 */
export const AuthenticationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime();
  
  try {
    let token = req.cookies?.accessToken;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AuthenticationRequiredException('No access token provided');
    }

    const payload = JwtUtil.verifyAccessToken(token);

    // Context Builder: Append strictly required identity fields
    RequestContextService.setIdentity({
      userId: payload.userId,
      tenantId: payload.tenantId, // Claimed tenant (will be verified by Tenant Resolver)
      sessionId: payload.sessionId,
    });

    // Record Metric
    const diff = process.hrtime(startTime);
    GlobalMetrics.recordHistogram('authentication_duration_ms', diff[0] * 1e3 + diff[1] * 1e-6);

    next();
  } catch (error: any) {
    // Standardize all JWT errors (Expired, Malformed) to a safe 401 response
    GlobalMetrics.incrementCounter('authentication_failures');
    next(new AuthenticationRequiredException('Invalid or expired access token'));
  }
};
