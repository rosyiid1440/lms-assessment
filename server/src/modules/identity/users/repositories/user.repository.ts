import { PrismaClient, Prisma } from '@prisma/client';
import { 
  CreateUserDTO, 
  UserFilter, 
  PaginationRequest, 
  SortRequest, 
  PaginatedResult,
  UserDetailDTO
} from '../dtos/user.dto';

export interface IUserRepository {
  findById(id: string, tenantId: string): Promise<UserDetailDTO | null>;
  findByEmail(email: string, tenantId: string): Promise<UserDetailDTO | null>;
  create(data: CreateUserDTO): Promise<UserDetailDTO>;
  updateStatus(id: string, tenantId: string, status: string): Promise<void>;
  softDelete(id: string, tenantId: string, deletedBy: string): Promise<void>;
  
  // Specification Pattern / Search
  findMany(
    filter: UserFilter, 
    pagination: PaginationRequest, 
    sort: SortRequest
  ): Promise<PaginatedResult<UserDetailDTO>>;
}

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string, tenantId: string): Promise<UserDetailDTO | null> {
    const user = await this.prisma.user.findUnique({
      where: { id, tenantId, deletedAt: null },
    });
    return user ? this.mapToDetailDTO(user) : null;
  }

  async findByEmail(email: string, tenantId: string): Promise<UserDetailDTO | null> {
    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email }, deletedAt: null },
    });
    return user ? this.mapToDetailDTO(user) : null;
  }

  async create(data: CreateUserDTO): Promise<UserDetailDTO> {
    const user = await this.prisma.user.create({
      data: {
        tenantId: data.tenantId,
        email: data.email,
        password: data.passwordHash,
        roleId: data.roleId,
        status: data.status as any, // Cast to Prisma Enum
        // avatarFileId: data.avatarFileId (Requires schema update to include avatarFileId on User)
      }
    });
    return this.mapToDetailDTO(user);
  }

  async updateStatus(id: string, tenantId: string, status: string): Promise<void> {
    await this.prisma.user.update({
      where: { id, tenantId },
      data: { status: status as any }
    });
  }

  /**
   * Enforcing Soft Delete Strategy (Audit safety)
   */
  async softDelete(id: string, tenantId: string, deletedBy: string): Promise<void> {
    await this.prisma.user.update({
      where: { id, tenantId },
      data: { 
        deletedAt: new Date(),
        updatedBy: deletedBy // Track who deleted it
      }
    });
  }

  /**
   * Specification Pattern Implementation using Prisma `where` builder
   */
  async findMany(
    filter: UserFilter, 
    pagination: PaginationRequest, 
    sort: SortRequest
  ): Promise<PaginatedResult<UserDetailDTO>> {
    
    // 1. Build Specification (Where Clause)
    const where: Prisma.UserWhereInput = {
      tenantId: filter.tenantId,
      deletedAt: null, // Global exclusion of soft-deleted
    };

    if (filter.search) {
      where.email = { contains: filter.search, mode: 'insensitive' };
    }
    if (filter.roleId) {
      where.roleId = filter.roleId;
    }
    if (filter.status) {
      where.status = filter.status as any;
    }
    if (filter.createdFrom || filter.createdTo) {
      where.createdAt = {};
      if (filter.createdFrom) where.createdAt.gte = filter.createdFrom;
      if (filter.createdTo) where.createdAt.lte = filter.createdTo;
    }

    // 2. Pagination Math
    const skip = (pagination.page - 1) * pagination.limit;
    
    // 3. Execute concurrently
    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: pagination.limit,
        orderBy: { [sort.sortBy]: sort.sortDir },
      })
    ]);

    return {
      data: users.map(this.mapToDetailDTO),
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      }
    };
  }

  // --- Internal Mapper ---
  private mapToDetailDTO(user: any): UserDetailDTO {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roleId: user.roleId,
      status: user.status as any,
      avatarFileId: user.avatarFileId, // Ensure DB Schema matches
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
