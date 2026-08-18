import { AppException } from './app.exception';
import { ErrorCode } from './catalog';

export class AuthenticationRequiredException extends AppException {
  constructor(message = 'Authentication required or token invalid') {
    super('AUTH_001', message);
  }
}

export class SessionInvalidException extends AppException {
  constructor(message = 'Session is invalid or has been revoked') {
    super('AUTH_002', message);
  }
}

export class TenantMismatchException extends AppException {
  constructor(message = 'Tenant mismatch detected') {
    super('TNT_001', message);
  }
}

export class TenantInactiveException extends AppException {
  constructor(message = 'The requested tenant is currently inactive') {
    super('TNT_002', message);
  }
}

