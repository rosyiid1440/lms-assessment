import { ZodError } from 'zod';
import { AppException, InternalServerException } from './app.exception';
import { IRequestContext } from '../context/request-context.service';

/**
 * RFC 7807 Problem Details Interface
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  correlationId?: string;
  requestId?: string;
  timestamp: string;
  errors?: Array<{ field: string; message: string }>;
}

export class ExceptionMapper {
  private static readonly BASE_TYPE_URL = 'https://api.lms.local/errors';

  /**
   * Transforms ANY Error into a strict RFC 7807 Problem Details object
   */
  static toProblemDetails(error: Error, reqPath: string, context?: IRequestContext): ProblemDetails {
    const timestamp = new Date().toISOString();
    const correlationId = context?.correlationId;
    const requestId = context?.requestId;

    // 1. Zod Validation Adapter
    if (error.name === 'ZodError' || error instanceof ZodError) {
      const issues = (error as any).issues || (error as any).errors || [];
      return {
        type: `${this.BASE_TYPE_URL}/REQ_001`,
        title: 'Validation Failed',
        status: 400,
        detail: 'One or more validation errors occurred.',
        instance: reqPath,
        correlationId,
        requestId,
        timestamp,
        errors: issues.map((e: any) => ({
          field: e.path ? e.path.join('.') : 'unknown',
          message: e.message,
        })),
      };
    }

    // 2. Known Application Exception
    if (error instanceof AppException) {
      return {
        type: `${this.BASE_TYPE_URL}/${error.errorCode}`,
        title: error.title,
        status: error.statusCode,
        detail: error.message, // Native Error message
        instance: reqPath,
        correlationId,
        requestId,
        timestamp,
        ...(error.metadata && { errors: error.metadata }), // attach metadata to errors array if present
      };
    }

    // 3. Unknown / Unexpected Errors (SyntaxError, DB Dropout, etc.)
    // We map it to an InternalServerException to obscure the stack trace from the client.
    const unhandled = new InternalServerException();
    return {
      type: `${this.BASE_TYPE_URL}/${unhandled.errorCode}`,
      title: unhandled.title,
      status: unhandled.statusCode,
      detail: unhandled.message, // Obscured detail: "An unexpected system error occurred."
      instance: reqPath,
      correlationId,
      requestId,
      timestamp,
    };
  }
}
