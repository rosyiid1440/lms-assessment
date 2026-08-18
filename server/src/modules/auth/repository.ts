import { PrismaClient, User, UserSession, RefreshToken, LoginHistory } from '@prisma/client';

/**
 * AuthRepository: Handles purely database operations for Authentication.
 * No business logic, purely data access and optimized queries.
 */
export class AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findUserByEmail(email: string, tenantId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        tenantId_email: { tenantId, email }
      }
    });
  }

  async createUserSession(data: {
    userId: string;
    tenantId: string;
    deviceId: string;
    deviceName: string;
    platform: string;
    browser: string;
    os: string;
    ipAddress: string;
  }): Promise<UserSession> {
    return this.prisma.userSession.create({
      data
    });
  }

  async saveRefreshToken(data: {
    userId: string;
    sessionId: string;
    hashedToken: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({
      data
    });
  }

  async findRefreshToken(hashedToken: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({
      where: { hashedToken },
      include: {
        session: true // Often needed to check if session is still valid
      }
    });
  }

  /**
   * Used for Refresh Token Rotation: Deletes old token and creates new one in a transaction.
   */
  async rotateRefreshToken(
    oldHashedToken: string, 
    newHashedToken: string, 
    sessionId: string,
    userId: string,
    expiresAt: Date
  ) {
    return this.prisma.$transaction([
      this.prisma.refreshToken.delete({ where: { hashedToken: oldHashedToken } }),
      this.prisma.refreshToken.create({
        data: {
          userId,
          sessionId,
          hashedToken: newHashedToken,
          expiresAt
        }
      })
    ]);
  }

  /**
   * Used for Session Revocation / Logout Device
   */
  async revokeSession(sessionId: string) {
    // Relying on Prisma Cascade delete if configured, otherwise explicitly delete tokens then session
    return this.prisma.userSession.delete({
      where: { id: sessionId }
    });
  }

  async revokeAllUserSessions(userId: string) {
    return this.prisma.userSession.deleteMany({
      where: { userId }
    });
  }

  async logLoginHistory(data: {
    userId: string;
    tenantId: string;
    sessionId?: string;
    ipAddress: string;
    userAgent: string;
    status: 'SUCCESS' | 'FAILED' | 'LOCKED';
    reason?: string;
  }): Promise<LoginHistory> {
    return this.prisma.loginHistory.create({
      data
    });
  }
}
