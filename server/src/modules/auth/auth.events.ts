/**
 * Standard Domain Event Payload
 */
export interface DomainEvent<T = any> {
  eventId: string;
  eventName: string;
  timestamp: string; // ISO String
  tenantId: string;
  userId?: string;
  metadata: T;
}

/**
 * Standardized Event Names for Authentication Module
 */
export const AUTH_EVENTS = {
  USER_LOGGED_IN: 'auth.user_logged_in',
  LOGIN_FAILED: 'auth.login_failed',
  ACCOUNT_LOCKED: 'auth.account_locked',
  SESSION_CREATED: 'auth.session_created',
  SESSION_REVOKED: 'auth.session_revoked',
  REFRESH_TOKEN_ROTATED: 'auth.refresh_token_rotated',
  REFRESH_TOKEN_REUSE_DETECTED: 'auth.refresh_token_reuse_detected',
  PASSWORD_CHANGED: 'auth.password_changed',
  PASSWORD_RESET: 'auth.password_reset',
  SESSION_RISK_DETECTED: 'auth.session_risk_detected',
} as const;

/**
 * Abstract Port for Event Emitter (Dependency Injection)
 * Prevents tight coupling to a specific event library (e.g., Node EventEmitter vs Redis PubSub)
 */
export interface IEventEmitter {
  emit<T>(eventName: string, payload: DomainEvent<T>): void;
}
