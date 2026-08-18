import { z } from 'zod';

export const UserStatusEnum = z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'LOCKED', 'ARCHIVED']);

export const CreateUserSchema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roleId: z.string().uuid(),
  status: UserStatusEnum.default('PENDING'),
  avatarFileId: z.string().uuid().optional(),
});

export const UpdateUserStatusSchema = z.object({
  status: UserStatusEnum,
  reason: z.string().max(500).optional(),
});

export const UserFilterSchema = z.object({
  search: z.string().max(100).optional(),
  roleId: z.string().uuid().optional(),
  status: UserStatusEnum.optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  
  // Pagination & Sorting (defaulting happens in controller, but validated here)
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['createdAt', 'email', 'status', 'lastLoginAt']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});
