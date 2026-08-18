import jwt from 'jsonwebtoken';
import { env } from '../../core/config/env';

/**
 * Slim payload: Only essential identity identifiers.
 * Authorization logic (roles/permissions) will be handled via DB/Cache.
 */
export interface JwtPayload {
  userId: string;
  tenantId: string;
  sessionId: string;
  tokenVersion: number;
}

export const JwtUtil = {
  signAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES,
    });
  },

  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
  },

  decodeAccessToken(token: string): JwtPayload | null {
    return jwt.decode(token) as JwtPayload | null;
  },

  isExpired(token: string): boolean {
    try {
      this.verifyAccessToken(token);
      return false;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return true;
      }
      return false; // For other errors (invalid signature), we treat it as invalid, not just expired
    }
  }
};
