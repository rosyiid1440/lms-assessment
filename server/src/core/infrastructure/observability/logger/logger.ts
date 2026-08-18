import pino from 'pino';
import { RequestContextService } from '../../../context/request-context.service';

/**
 * Enterprise JSON Logger (Pino).
 * Zero-allocation overhead, extremely fast.
 * 
 * Redaction prevents secrets from entering Docker logs -> Promtail -> Loki.
 */
export const Logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  redact: {
    paths: [
      'password', 'passwordHash', 'token', 'refreshToken', 'accessToken',
      'authorization', 'cookie', 'pepper', 'secret', '*.password'
    ],
    censor: '********'
  },
  // Dynamic Mixin to attach Context (Correlation ID, Tenant ID) without Prop-Drilling
  mixin() {
    try {
      const ctx = RequestContextService.getContext();
      if (!ctx) return {};
      return {
        correlationId: ctx.correlationId,
        requestId: ctx.requestId,
        tenantId: ctx.identity?.tenantId,
        userId: ctx.identity?.userId,
      };
    } catch {
      return {}; // Failsafe if accessed outside AsyncLocalStorage context
    }
  }
});
