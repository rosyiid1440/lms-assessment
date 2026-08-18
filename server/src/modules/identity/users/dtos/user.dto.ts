/**
 * User Status State Machine
 */
export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'LOCKED' | 'ARCHIVED';

// ---------------------------------------------------------
// INPUT DTOs (Write Operations)
// ---------------------------------------------------------

export interface CreateUserDTO {
  tenantId: string;
  email: string;
  passwordHash: string; // Service handles hashing before this DTO reaches Repo
  roleId: string;
  status: UserStatus;
  avatarFileId?: string; // Reference to File Domain
}

export interface UpdateUserStatusDTO {
  status: UserStatus;
  reason?: string; // For Timeline / Audit
}

// ---------------------------------------------------------
// SEARCH & SPECIFICATION DTOs (Read Operations)
// ---------------------------------------------------------

export interface UserFilter {
  search?: string; // Searches email (Profile searches handled separately or via joins later)
  roleId?: string;
  status?: UserStatus;
  tenantId: string;
  createdFrom?: Date;
  createdTo?: Date;
}

export interface PaginationRequest {
  page: number;
  limit: number;
}

export interface SortRequest {
  sortBy: string; // e.g., 'createdAt', 'email'
  sortDir: 'asc' | 'desc';
}

// ---------------------------------------------------------
// OUTPUT DTOs (Responses)
// ---------------------------------------------------------

export interface UserSummaryDTO {
  id: string;
  email: string;
  roleId: string;
  status: UserStatus;
  avatarFileId?: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface UserDetailDTO extends UserSummaryDTO {
  tenantId: string;
  updatedAt: Date;
  // Future inclusion of preferences, etc.
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
