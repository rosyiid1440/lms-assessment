import { Request, Response, NextFunction } from 'express';
import { ExceptionMapper } from '../exceptions/mapper';
import { RequestContextService } from '../context/request-context.service';
import { AppException } from '../exceptions/app.exception';

/**
 * Interface for async event publishing, injected or imported
 */
interface IErrorEventPublisher {
  publishAsync(eventName: string, payload: any): void;
}

// Temporary NoOp Publisher until real implementation
const ErrorEventPublisher: IErrorEventPublisher = {
  publishAsync: (eventName, payload) => {
    // Fire and forget
    // console.log(`[EVENT] ${eventName}`);
  }
};

/**
 * Global Error Handler Middleware
 * Catch-all for Exceptions -> Logs -> Events -> RFC 7807 Response
 */
export const GlobalErrorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 1. Retrieve Context safely (might crash before context is initialized)
  let context;
  try {
    context = RequestContextService.getContext();
  } catch (e) {
    context = undefined;
  }

  // 2. Map Error to RFC 7807 Standard
  const problemDetails = ExceptionMapper.toProblemDetails(error, req.originalUrl, context);

  // 3. Logging Strategy (4xx = Warn, 5xx = Error)
  const isServerError = problemDetails.status >= 500;
  
  if (isServerError) {
    // Log the true stack trace for developers, keeping the ProblemDetails pristine for the client
    console.error(`[ERROR] [${context?.correlationId || 'SYS'}]`, error);
  } else {
    // Log Business Exceptions & Validations as Warnings
    console.warn(`[WARN] [${context?.correlationId || 'SYS'}] ${problemDetails.title} - ${problemDetails.detail}`);
  }

  // 4. Async Audit Event Integration (Fire and Forget)
  // The Audit Module will decide if this needs DB storage
  setTimeout(() => {
    const eventName = isServerError ? 'system.unexpected_failure' : 'client.bad_request';
    ErrorEventPublisher.publishAsync(eventName, {
      errorType: problemDetails.type,
      correlationId: context?.correlationId,
      identity: context?.identity,
      detail: isServerError ? error.stack : problemDetails.detail,
    });
  }, 0);

  // 5. Send RFC 7807 JSON Response
  res.status(problemDetails.status).json(problemDetails);
};
