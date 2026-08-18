export interface WebhookPayload {
  eventId: string;
  topic: string; // e.g., 'student.created', 'grade.published'
  timestamp: string;
  data: Record<string, any>;
}

export interface WebhookDeliveryConfig {
  endpointUrl: string;
  secretKey: string; // For HMAC signature
  maxRetries: number;
}

/**
 * Enterprise Webhook Dispatcher
 */
export interface IWebhookDispatcher {
  /**
   * Dispatches a webhook asynchronously with HMAC signature and exponential backoff retry.
   */
  dispatch(payload: WebhookPayload, config: WebhookDeliveryConfig): Promise<void>;
  
  /**
   * Retrieves messages that failed permanently after max retries.
   */
  getDeadLetterQueue(): Promise<any[]>;
  
  /**
   * Replays a failed webhook event.
   */
  replay(eventId: string, config: WebhookDeliveryConfig): Promise<void>;
}
