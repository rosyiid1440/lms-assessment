import { AuthorizationContext, AuthorizationResult } from './types';

/**
 * Standard Logger for Authorization Decisions.
 * Emits structured JSON logs ready for SIEM / Aggregation.
 */
export interface IAuthorizationLogger {
  logDecision(result: AuthorizationResult, ctx: AuthorizationContext): void;
}

export class ConsoleAuthorizationLogger implements IAuthorizationLogger {
  logDecision(result: AuthorizationResult, ctx: AuthorizationContext): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId: ctx.requestContext.requestId,
      correlationId: ctx.requestContext.correlationId,
      tenantId: ctx.requestContext.identity?.tenantId,
      userId: ctx.requestContext.identity?.userId,
      resource: result.resource,
      action: result.action,
      policy: result.policyName,
      allowed: result.allowed,
      durationMs: result.executionTimeMs,
      reason: result.reason,
    };

    // Use stdout for standard logs, stderr for anomalies (optional)
    if (result.allowed) {
      console.log(JSON.stringify({ level: 'INFO', type: 'AUTHZ_DECISION', ...logEntry }));
    } else {
      console.warn(JSON.stringify({ level: 'WARN', type: 'AUTHZ_DECISION', ...logEntry }));
    }
  }
}
