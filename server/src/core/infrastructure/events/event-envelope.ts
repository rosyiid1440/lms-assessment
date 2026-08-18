/**
 * Canonical Event Envelope for the Infrastructure Layer.
 * 
 * All events flowing through EventBus / Outbox / Workers MUST carry this shape.
 * Provides end-to-end distributed tracing:
 * 
 *   HTTP → Outbox → Worker → Notification → Email
 * 
 * Metadata fields:
 *   - correlationId : ties all events in a single user request
 *   - causationId   : the event/command that directly caused this event
 *   - eventId       : globally unique identifier for this specific event
 *   - occurredAt    : ISO 8601 timestamp when the event occurred
 */
export interface EventEnvelope<T = any> {
  readonly eventId: string;
  readonly eventName: string;
  readonly eventVersion: string;
  readonly occurredAt: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly requestId: string;
  readonly metadata: T;
}

/**
 * Maps raw domain events (which may use legacy 'timestamp' field)
 * to canonical EventEnvelope format.
 * 
 * This function is the boundary adapter between Domain and Infrastructure.
 */
export function toEventEnvelope<T>(raw: Record<string, any>): EventEnvelope<T> {
  return {
    eventId: raw.eventId,
    eventName: raw.eventName,
    eventVersion: raw.eventVersion || '1.0',
    occurredAt: raw.occurredAt || raw.timestamp || new Date().toISOString(),
    tenantId: raw.tenantId,
    userId: raw.userId,
    correlationId: raw.correlationId,
    causationId: raw.causationId,
    requestId: raw.requestId,
    metadata: raw.metadata,
  };
}
