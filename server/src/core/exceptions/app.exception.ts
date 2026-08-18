import { ERROR_CATALOG, ErrorCode } from './catalog';

/**
 * Base Application Exception.
 * Guarantees a standardized structure for mapping to RFC 7807.
 */
export class AppException extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly title: string;
  public readonly metadata?: any;

  constructor(code: ErrorCode, detail: string, metadata?: any) {
    const catalog = ERROR_CATALOG[code];
    super(detail); // Native Error Message
    Object.setPrototypeOf(this, new.target.prototype);

    this.errorCode = code;
    this.statusCode = catalog.status;
    this.title = catalog.title;
    this.metadata = metadata;

    Error.captureStackTrace(this, this.constructor);
  }
}

// ------------------------------------------------------------------
// Core Exception Hierarchy
// ------------------------------------------------------------------

export class ValidationException extends AppException {
  constructor(detail = 'One or more fields failed validation', metadata?: any) {
    super('REQ_001', detail, metadata);
  }
}

export class ResourceNotFoundException extends AppException {
  constructor(resourceName: string, identifier?: string) {
    super('RES_001', `${resourceName} ${identifier ? `(${identifier}) ` : ''}could not be found.`);
  }
}

export class ConflictException extends AppException {
  constructor(detail: string) {
    super('RES_002', detail);
  }
}

export class BusinessRuleException extends AppException {
  constructor(detail: string, metadata?: any) {
    super('RES_003', detail, metadata);
  }
}

export class InternalServerException extends AppException {
  constructor(detail = 'An unexpected system error occurred.') {
    // We mask the true error detail in the API response later, but keep it here for logs
    super('SYS_001', detail);
  }
}
