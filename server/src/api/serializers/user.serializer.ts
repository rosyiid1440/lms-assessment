import { UserDetailDTO } from '../../../modules/identity/users/dtos/user.dto';

/**
 * Serializers act as the Anti-Corruption Layer between Domain DTOs and the Public API JSON.
 * Protects frontend integrations from internal refactoring.
 */
export class UserSerializer {
  
  /**
   * Translates the strict internal UserDetailDTO into the Public JSON representation.
   */
  static toPublicProfile(dto: UserDetailDTO) {
    return {
      id: dto.id,
      // If the domain renames 'email' to 'contactEmail' tomorrow, 
      // we only change the right side here. The public API remains stable.
      email: dto.email, 
      status: dto.status,
      // Suppress 'roleId' internally, expose an abstraction if needed
      isTeacher: dto.roleId === 'TEACHER_ROLE_ID_MOCK', // Simplified example
      joinedAt: dto.createdAt.toISOString(),
      
      // Hide internal system fields like tenantId, updatedAt, etc.
    };
  }

  static toPublicList(dtos: UserDetailDTO[]) {
    return dtos.map(this.toPublicProfile);
  }
}
