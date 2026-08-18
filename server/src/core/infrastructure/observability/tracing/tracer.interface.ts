/**
 * OpenTelemetry-Compatible Tracing Abstraction.
 * 
 * Placeholder interface — allows future migration to OpenTelemetry
 * without touching Service or Domain layers.
 * 
 * Current implementation: NoOpTracer (zero overhead).
 * Future: OpenTelemetryTracer wrapping @opentelemetry/api.
 */

// ---------------------------------------------------------
// Span Interface
// ---------------------------------------------------------

export interface ISpan {
  /** End the span and record its duration. */
  end(): void;

  /** Set attributes on this span for filtering/searching. */
  setAttributes(attributes: Record<string, string | number | boolean>): void;

  /** Record an exception on this span. */
  recordException(error: Error): void;

  /** Set span status to error. */
  setError(message: string): void;
}

// ---------------------------------------------------------
// Tracer Interface
// ---------------------------------------------------------

export interface ITracer {
  /** Start a new span. Caller is responsible for calling span.end(). */
  startSpan(name: string, attributes?: Record<string, string | number | boolean>): ISpan;

  /** Run a callback within a span, automatically ending it on completion. */
  withSpan<T>(name: string, fn: () => Promise<T>, attributes?: Record<string, string | number | boolean>): Promise<T>;
}

// ---------------------------------------------------------
// NoOp Implementation (Zero Overhead)
// ---------------------------------------------------------

class NoOpSpan implements ISpan {
  end(): void {}
  setAttributes(): void {}
  recordException(): void {}
  setError(): void {}
}

/**
 * No-operation tracer — used until OpenTelemetry is enabled.
 * All methods are zero-cost no-ops.
 */
export class NoOpTracer implements ITracer {
  startSpan(): ISpan {
    return new NoOpSpan();
  }

  async withSpan<T>(_name: string, fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}

// Singleton — swap this with OpenTelemetryTracer when ready
export const GlobalTracer: ITracer = new NoOpTracer();
