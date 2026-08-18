import { Request, Response, NextFunction } from 'express';
import { RequestContextService } from '../context/request-context.service';

/**
 * Basic Logger (Can be swapped with Winston/Pino later).
 * Ready for Observability/Metrics integration.
 */
export const RequestLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime();
  const { correlationId, requestId } = RequestContextService.getContext();

  // Log Incoming Request
  console.log(`[REQ] [${correlationId}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);

  // Hook into response finish to calculate latency
  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const latencyMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    
    // Future: Emit to Prometheus metric (e.g., http_request_duration_milliseconds)
    console.log(`[RES] [${correlationId}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Latency: ${latencyMs}ms`);
  });

  next();
};
