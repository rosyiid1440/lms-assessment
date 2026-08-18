/**
 * OpenTelemetry-Compatible Logger Abstraction.
 * 
 * All services and infrastructure components should depend on ILogger,
 * not on Pino directly. This enables future migration to OpenTelemetry
 * Logs API without touching Service or Domain layers.
 * 
 * Current implementation: Pino (see logger.ts).
 * Future: OpenTelemetry LoggerProvider.
 */
export interface ILogger {
  fatal(obj: object | string, msg?: string): void;
  error(obj: object | string, msg?: string): void;
  warn(obj: object | string, msg?: string): void;
  info(obj: object | string, msg?: string): void;
  debug(obj: object | string, msg?: string): void;
  trace(obj: object | string, msg?: string): void;

  /** Create a child logger with bound fields. */
  child(bindings: Record<string, any>): ILogger;
}
