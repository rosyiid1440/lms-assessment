import { AsyncLocalStorage } from 'async_hooks';

export interface RequestIdentity {
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  roleId?: string;
}

export interface IRequestContext {
  correlationId: string;
  requestId: string;
  identity?: RequestIdentity;
  // Note: Permissions are NOT stored here to prevent stale cache issues.
}

/**
 * Agnostic Wrapper for AsyncLocalStorage.
 * Ensures Thread-Safe request context without prop-drilling.
 */
export class RequestContextService {
  private static storage = new AsyncLocalStorage<IRequestContext>();

  /**
   * Initializes the context for the current asynchronous execution track (e.g., an HTTP Request)
   */
  static run<T>(context: IRequestContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  /**
   * Retrieves the current context. Throws if accessed outside a valid execution track.
   */
  static getContext(): IRequestContext {
    const context = this.storage.getStore();
    if (!context) {
      throw new Error('RequestContext is not initialized. Ensure middleware is configured properly.');
    }
    return context;
  }

  static getCorrelationId(): string {
    return this.getContext().correlationId;
  }

  /**
   * Updates the identity within the current context.
   * Useful after Authentication & Tenant Resolver middlewares complete their checks.
   */
  static setIdentity(identity: RequestIdentity): void {
    const context = this.getContext();
    context.identity = { ...context.identity, ...identity };
  }

  static getIdentity(): RequestIdentity | undefined {
    return this.getContext().identity;
  }
}
