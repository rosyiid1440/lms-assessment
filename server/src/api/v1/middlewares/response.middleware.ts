import { Request, Response, NextFunction } from 'express';
import { RequestContextService } from '../../../core/context/request-context.service';

/**
 * Standard Response Envelope Format
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: any;
  meta: {
    requestId: string;
    correlationId: string;
    version: string;
    timestamp: string;
  };
}

/**
 * Utility to wrap responses cleanly in Controllers
 */
export class ResponseHandler {
  static success<T>(res: Response, data: T, pagination?: any) {
    const ctx = RequestContextService.getContext();
    const payload: ApiResponse<T> = {
      success: true,
      data,
      ...(pagination && { pagination }),
      meta: {
        requestId: ctx.requestId,
        correlationId: ctx.correlationId,
        version: 'v1', // Should be injected dynamically based on router mounting
        timestamp: new Date().toISOString(),
      },
    };
    
    // Express response sending
    res.status(200).json(payload);
  }
}

/**
 * Middleware for marking API endpoints as Deprecated.
 * Complies with IETF Draft standards for HTTP Deprecation Headers.
 */
export const deprecateApi = (options: { since: string; sunsetDate: string; replacementUrl?: string }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', new Date(options.sunsetDate).toUTCString());
    if (options.replacementUrl) {
      res.setHeader('Link', `<${options.replacementUrl}>; rel="alternate"`);
    }
    
    // Future: Emit a metric to track usage of deprecated APIs to know when it's safe to turn off
    // GlobalMetrics.incrementCounter('deprecated_api_usage', { path: req.route.path });
    
    next();
  };
};
