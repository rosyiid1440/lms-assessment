import { UserSummaryDTO, UserDetailDTO, UserStatus } from './dtos/user.dto';

export interface UserListItemDTO {
  id: string;
  email: string;
  status: UserStatus;
  roleId: string;
  avatarFileId?: string;
}

/**
 * Pure Mapper Class.
 * Translates raw DB entities into strongly typed, restricted DTOs.
 */
export class UserMapper {
  static toDetailDTO(user: any): UserDetailDTO {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roleId: user.roleId,
      status: user.status as UserStatus,
      avatarFileId: user.avatarFileId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  static toSummaryDTO(user: any): UserSummaryDTO {
    return {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      status: user.status as UserStatus,
      avatarFileId: user.avatarFileId,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  static toListItemDTO(user: any): UserListItemDTO {
    return {
      id: user.id,
      email: user.email,
      status: user.status as UserStatus,
      roleId: user.roleId,
      avatarFileId: user.avatarFileId,
    };
  }
}
