import { EventEnvelope } from './event-envelope';
import { Logger } from '../observability/logger/logger';

export type EventHandler<T = any> = (event: EventEnvelope<T>) => Promise<void>;

/**
 * Universal Event Bus Interface.
 * Agnostic to Memory, RabbitMQ, or NATS.
 * 
 * All events use EventEnvelope for end-to-end tracing.
 */
export interface IEventBus {
  publish<T>(event: EventEnvelope<T>): Promise<void>;
  subscribe<T>(eventName: string, handler: EventHandler<T>): void;
  getSubscriberCount(eventName: string): number;
}

/**
 * In-Memory Event Bus for Local Dev & Integration Testing.
 * Processes events asynchronously to simulate real message brokers.
 * 
 * Note: Instrumented version (InstrumentedEventBus) wraps this
 * in production to add metrics without polluting this class.
 */
export class MemoryEventBus implements IEventBus {
  private handlers = new Map<string, EventHandler[]>();

  async publish<T>(event: EventEnvelope<T>): Promise<void> {
    const eventHandlers = this.handlers.get(event.eventName) || [];

    // Fire and forget: Simulate async message broker delivery
    setTimeout(() => {
      for (const handler of eventHandlers) {
        handler(event).catch(err => {
          Logger.error({
            type: 'EVENT_BUS_ERROR',
            eventName: event.eventName,
            eventId: event.eventId,
            error: err.message,
          }, `Failed to process event: ${event.eventName}`);
        });
      }
    }, 0);
  }

  subscribe<T>(eventName: string, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventName) || [];
    existing.push(handler);
    this.handlers.set(eventName, existing);
  }

  getSubscriberCount(eventName: string): number {
    return (this.handlers.get(eventName) || []).length;
  }

  /** Returns total number of registered subscriptions across all event types. */
  getTotalSubscriberCount(): number {
    let total = 0;
    for (const handlers of this.handlers.values()) {
      total += handlers.length;
    }
    return total;
  }
}
