import { IEventBus, EventHandler } from './event-bus';
import { EventEnvelope } from './event-envelope';
import { GlobalMetricsRegistry } from '../observability/metrics/metrics.registry';
import { Logger } from '../observability/logger/logger';

// ---------------------------------------------------------
// EventBus Metrics
// ---------------------------------------------------------

const publishedTotal = GlobalMetricsRegistry.createCounter(
  'eventbus_published_total',
  'Total published events',
  ['event_name', 'status'] // status: SUCCESS, FAILED
);

const processingDuration = GlobalMetricsRegistry.createHistogram(
  'eventbus_processing_duration_seconds',
  'Event bus handler processing duration',
  [0.01, 0.05, 0.1, 0.5, 1, 5],
  ['event_name', 'status'] // status: SUCCESS, FAILED
);

const subscriberGauge = GlobalMetricsRegistry.createGauge(
  'eventbus_subscriber_count',
  'Number of subscribers per event',
  ['event_name']
);

/**
 * Decorator pattern to instrument any IEventBus implementation.
 * Transparently tracks publishing and subscription metrics.
 */
export class InstrumentedEventBus implements IEventBus {
  constructor(private readonly delegate: IEventBus) {}

  async publish<T>(event: EventEnvelope<T>): Promise<void> {
    try {
      await this.delegate.publish(event);
      publishedTotal.inc({ event_name: event.eventName, status: 'SUCCESS' });
    } catch (error) {
      publishedTotal.inc({ event_name: event.eventName, status: 'FAILED' });
      throw error;
    }
  }

  subscribe<T>(eventName: string, handler: EventHandler<T>): void {
    // Wrap handler to measure duration and catch failures independently
    const wrappedHandler: EventHandler<T> = async (event: EventEnvelope<T>) => {
      const start = process.hrtime();
      try {
        await handler(event);
        const diff = process.hrtime(start);
        processingDuration.observe(diff[0] + diff[1] * 1e-9, { event_name: eventName, status: 'SUCCESS' });
      } catch (error: any) {
        const diff = process.hrtime(start);
        processingDuration.observe(diff[0] + diff[1] * 1e-9, { event_name: eventName, status: 'FAILED' });
        
        // Log the failure at the instrumentation boundary
        Logger.error({
          type: 'SUBSCRIBER_FAILED',
          eventName: event.eventName,
          eventId: event.eventId,
          error: error.message,
        }, `Subscriber failed processing event: ${event.eventName}`);
        
        throw error;
      }
    };

    this.delegate.subscribe(eventName, wrappedHandler);
    
    // Update subscriber gauge
    const count = this.delegate.getSubscriberCount(eventName);
    subscriberGauge.set(count, { event_name: eventName });
  }

  getSubscriberCount(eventName: string): number {
    return this.delegate.getSubscriberCount(eventName);
  }
}
