import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RequestContextService, IRequestContext } from '../context/request-context.service';

/**
 * Initializes the RequestContext and sets Correlation/Request IDs.
 * MUST be the very first middleware in the pipeline.
 */
export const CorrelationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  const requestId = uuidv4();

  // Attach to response headers for client tracing
  res.setHeader('X-Correlation-ID', correlationId);
  res.setHeader('X-Request-ID', requestId);

  const context: IRequestContext = {
    correlationId,
    requestId,
  };

  // Run the rest of the Express pipeline inside this context zone
  RequestContextService.run(context, () => {
    next();
  });
};
