import { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodType } from 'zod';

/**
 * Validates request data against a Zod Schema.
 * Throws ZodError which is caught by ExceptionMapper (RFC 7807 -> REQ_001).
 */
export const validateRequest = (schemas: { body?: ZodType; query?: ZodType; params?: ZodType }) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) Object.defineProperty(req, 'query', { value: schemas.query.parse(req.query), configurable: true, writable: true });
      if (schemas.params) Object.defineProperty(req, 'params', { value: schemas.params.parse(req.params), configurable: true, writable: true });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error); // Forward directly to global error handler
      } else {
        next(error);
      }
    }
  };
};
