import { User, UserSession, RefreshToken, LoginHistory } from '@prisma/client';

/**
 * Agnostic representation of Session/Auth data used by Services
 */
export interface CreateSessionDTO {
  userId: string;
  tenantId: string;
  deviceId: string;
  deviceName: string;
  platform: string;
  browser: string;
  os: string;
  ipAddress: string;
}

export interface CreateLoginHistoryDTO {
  userId?: string;
  tenantId: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  status: 'SUCCESS' | 'FAILED' | 'LOCKED';
  loginMethod: string;
  failureReason?: string;
  authenticationProvider: string;
}

export interface IAuthRepository {
  // User Lookups
  findUserByEmail(email: string, tenantId: string): Promise<User | null>;
  findUserById(userId: string): Promise<User | null>;

  // Brute Force & Lockout
  recordLoginAttempt(userId: string, tenantId: string, email: string, ipAddress: string, success: boolean, failureReason?: string): Promise<void>;
  countFailedLoginAttempts(userId: string, since: Date): Promise<number>;

  // Atomic Login Transaction
  createSessionWithTokens(
    sessionData: CreateSessionDTO,
    refreshTokenData: { hashedToken: string; expiresAt: Date },
    historyData: CreateLoginHistoryDTO
  ): Promise<{ session: UserSession; refreshToken: RefreshToken; history: LoginHistory }>;

  // Refresh Token Operations
  findRefreshToken(hashedToken: string): Promise<(RefreshToken & { session: UserSession }) | null>;
  
  // Atomic Refresh Token Rotation (Status update + Create new)
  rotateRefreshToken(
    oldTokenId: string,
    newHashedToken: string,
    sessionId: string,
    userId: string,
    expiresAt: Date
  ): Promise<{ newRefreshToken: RefreshToken }>;

  // Security & Revocation
  markAllSessionsAndTokensRevoked(userId: string, reason: string): Promise<void>;
}

export interface ISessionRepository {
  findActiveSessionsByUserId(userId: string): Promise<UserSession[]>;
  findSessionById(sessionId: string): Promise<UserSession | null>;
  revokeSession(sessionId: string): Promise<void>;
  revokeAllSessions(userId: string): Promise<void>;
  updateSessionActivity(sessionId: string, lastActivityAt: Date): Promise<void>;
}
