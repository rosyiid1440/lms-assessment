import { PrismaClient, User, UserSession, RefreshToken, LoginHistory } from '@prisma/client';
import { IAuthRepository, ISessionRepository, CreateSessionDTO, CreateLoginHistoryDTO } from './repository.interface';

export class PrismaAuthRepository implements IAuthRepository, ISessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findUserByEmail(email: string, tenantId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });
  }

  async findUserById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async recordLoginAttempt(userId: string, tenantId: string, email: string, ipAddress: string, success: boolean, failureReason?: string): Promise<void> {
    // Assuming LoginAttempt model exists in updated schema
    await (this.prisma as any).loginAttempt.create({
      data: { tenantId, userId, email, ipAddress, success, failureReason },
    });
  }

  async countFailedLoginAttempts(userId: string, since: Date): Promise<number> {
    return (this.prisma as any).loginAttempt.count({
      where: {
        userId,
        success: false,
        createdAt: { gte: since },
      },
    });
  }

  async createSessionWithTokens(
    sessionData: CreateSessionDTO,
    refreshTokenData: { hashedToken: string; expiresAt: Date },
    historyData: CreateLoginHistoryDTO
  ): Promise<{ session: UserSession; refreshToken: RefreshToken; history: LoginHistory }> {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.userSession.create({
        data: {
          ...sessionData,
          loginAt: new Date(),
          lastActivityAt: new Date(),
          isTrustedDevice: true, // simplified logic, normally passed down from service
        },
      });

      console.log('--- DBG: sessionData.tenantId is ---', sessionData.tenantId);
      const refreshToken = await tx.refreshToken.create({
        data: {
          tenantId: sessionData.tenantId,
          userId: sessionData.userId,
          sessionId: session.id,
          hashedToken: refreshTokenData.hashedToken,
          expiresAt: refreshTokenData.expiresAt,
          status: 'ACTIVE',
        },
      });

      const history = await tx.loginHistory.create({
        data: {
          ...historyData,
          sessionId: session.id,
        },
      });

      return { session, refreshToken, history };
    });
  }

  async findRefreshToken(hashedToken: string): Promise<(RefreshToken & { session: UserSession }) | null> {
    return (this.prisma.refreshToken as any).findUnique({
      where: { hashedToken },
      include: { session: true },
    });
  }

  async rotateRefreshToken(
    oldTokenId: string,
    newHashedToken: string,
    sessionId: string,
    userId: string,
    expiresAt: Date
  ): Promise<{ newRefreshToken: RefreshToken }> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Mark old token as USED
      const oldToken = await tx.refreshToken.update({
        where: { id: oldTokenId },
        data: { status: 'USED', rotatedAt: new Date() },
      });

      // 2. Create new token pointing to the old one (rotatedFromTokenId)
      const newRefreshToken = await tx.refreshToken.create({
        data: {
          tenantId: oldToken.tenantId,
          userId,
          sessionId,
          hashedToken: newHashedToken,
          expiresAt,
          status: 'ACTIVE',
          rotatedFromTokenId: oldTokenId,
        },
      });

      // 3. Update session's lastRefreshAt
      await (tx.userSession as any).update({
        where: { id: sessionId },
        data: { lastRefreshAt: new Date() },
      });

      return { newRefreshToken };
    });
  }

  async markAllSessionsAndTokensRevoked(userId: string, reason: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await (tx.refreshToken as any).updateMany({
        where: { userId, status: 'ACTIVE' },
        data: { status: 'REVOKED', revokedAt: new Date(), revokedReason: reason },
      });

      await (tx.userSession as any).updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  }

  // --- Session Repository Implementation ---

  async findActiveSessionsByUserId(userId: string): Promise<UserSession[]> {
    return (this.prisma.userSession as any).findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  async findSessionById(sessionId: string): Promise<UserSession | null> {
    return this.prisma.userSession.findUnique({ where: { id: sessionId } });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await (tx.userSession as any).update({
        where: { id: sessionId },
        data: { revokedAt: new Date(), logoutAt: new Date() },
      });
      await (tx.refreshToken as any).updateMany({
        where: { sessionId, status: 'ACTIVE' },
        data: { status: 'REVOKED', revokedAt: new Date(), revokedReason: 'SESSION_REVOKED' },
      });
    });
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.markAllSessionsAndTokensRevoked(userId, 'USER_LOGOUT_ALL');
  }

  async updateSessionActivity(sessionId: string, lastActivityAt: Date): Promise<void> {
    await (this.prisma.userSession as any).update({
      where: { id: sessionId },
      data: { lastActivityAt },
    });
  }
}
