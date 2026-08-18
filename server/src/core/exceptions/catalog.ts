/**
 * Catalog of standardized Error Codes.
 * Used by the Frontend to trigger specific UI states (e.g., Modals, Redirects).
 */
export const ERROR_CATALOG = {
  // Authentication & Authorization (AUTH)
  AUTH_001: { status: 401, title: 'Authentication Required' },
  AUTH_002: { status: 401, title: 'Invalid or Expired Token' },
  AUTH_003: { status: 403, title: 'Permission Denied' },
  AUTH_004: { status: 403, title: 'Ownership Denied' },
  AUTH_005: { status: 423, title: 'Account Locked' },
  
  // Tenant & Multi-School (TNT)
  TNT_001: { status: 403, title: 'Tenant Mismatch Detected' },
  TNT_002: { status: 403, title: 'Tenant Inactive or Suspended' },

  // Validation & Input (REQ)
  REQ_001: { status: 400, title: 'Validation Failed' },
  REQ_002: { status: 400, title: 'Malformed Request Data' },

  // Resources (RES)
  RES_001: { status: 404, title: 'Resource Not Found' },
  RES_002: { status: 409, title: 'Resource Conflict (Already Exists)' },
  RES_003: { status: 422, title: 'Business Rule Violation' },

  // System (SYS)
  SYS_001: { status: 500, title: 'Internal Server Error' },
  SYS_002: { status: 503, title: 'External Service Unavailable' },
  SYS_003: { status: 429, title: 'Rate Limit Exceeded' },
} as const;

export type ErrorCode = keyof typeof ERROR_CATALOG;
