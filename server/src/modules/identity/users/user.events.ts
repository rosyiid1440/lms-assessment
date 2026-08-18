import { ReadonlyDomainEvent } from '../../authorization/types';

/**
 * Standard Immutable Payload structure for Identity Events
 */
interface IdentityEventPayload {
  userId: string;
  email: string;
  roleId: string;
  status: string;
  reason?: string;
  changedBy?: string;
}

export type UserDomainEvent = ReadonlyDomainEvent<IdentityEventPayload>;

export const IDENTITY_EVENTS = {
  USER_CREATED: 'identity.user_created',
  USER_ACTIVATED: 'identity.user_activated',
  USER_SUSPENDED: 'identity.user_suspended',
  USER_LOCKED: 'identity.user_locked',
  USER_ARCHIVED: 'identity.user_archived',
  USER_RESTORED: 'identity.user_restored',
  PASSWORD_CHANGED: 'identity.password_changed',
  ROLE_CHANGED: 'identity.role_changed',
} as const;
