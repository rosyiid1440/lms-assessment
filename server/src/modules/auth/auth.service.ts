import { IAuthRepository, CreateSessionDTO, CreateLoginHistoryDTO } from './repository.interface';
import { HashUtil } from '../../shared/utils/hash.util';
import { TokenUtil } from '../../shared/utils/token.util';
import { JwtUtil } from '../../shared/utils/jwt.util';
import { env } from '../../core/config/env';
import { AuthenticationRequiredException } from '../../core/exceptions/security.exception';
import { BusinessRuleException } from '../../core/exceptions/app.exception';

// ...
export interface ReadonlyDomainEvent<T = any> {
// ...
  readonly eventId: string;
  readonly eventName: string;
  readonly eventVersion: string;
  readonly timestamp: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly correlationId: string;
  readonly requestId: string;
  readonly metadata: T;
}

export interface IEventPublisher {
  publish<T>(event: ReadonlyDomainEvent<T>): void;
}

export class AuthService {
  constructor(
    private readonly authRepo: IAuthRepository,
    private readonly eventPublisher: IEventPublisher
  ) {}

  /**
   * Flow: findUserByEmail -> checkActive -> checkLocked -> verifyPassword -> createSession
   */
  async login(
    email: string, 
    password: string, 
    tenantId: string, 
    deviceData: Omit<CreateSessionDTO, 'userId' | 'tenantId'>,
    reqContext: { correlationId: string; requestId: string; ipAddress: string; userAgent: string }
  ) {
    // 1. Find User
    const user = await this.authRepo.findUserByEmail(email, tenantId);
    if (!user) {
      // Prevent user enumeration by taking similar time to process
      await HashUtil.hash(password);
      throw new AuthenticationRequiredException('INVALID_CREDENTIALS');
    }

    // 2. Check Active
    if (user.status !== 'ACTIVE') {
      throw new AuthenticationRequiredException('ACCOUNT_INACTIVE');
    }

    // 3. Check Locked (Brute Force Protection)
    const lockoutTime = new Date(Date.now() - 15 * 60 * 1000); // 15 mins
    const failedAttempts = await this.authRepo.countFailedLoginAttempts(user.id, lockoutTime);
    if (failedAttempts >= 5) { // 5 attempts max
      this.publishSecurityEvent('SECURITY_ACCOUNT_LOCKED', user, reqContext, { failedAttempts });
      throw new AuthenticationRequiredException('ACCOUNT_LOCKED');
    }

    // 4. Verify Password
    const isValid = await HashUtil.verify(user.passwordHash, password); // Note: verify passwordHash!
    if (!isValid) {
      await this.authRepo.recordLoginAttempt(user.id, tenantId, email, reqContext.ipAddress, false, 'WRONG_PASSWORD');
      this.publishEvent('AUTH_LOGIN_FAILED', user, reqContext, { reason: 'WRONG_PASSWORD' });
      throw new AuthenticationRequiredException('INVALID_CREDENTIALS');
    }

    // 5. Session Risk Detection (Simplified comparison)
    // Normally we'd fetch recent sessions and compare IP/Device. 
    // If anomaly detected -> isTrustedDevice = false
    const isTrustedDevice = true; 

    // 6. Generate Tokens
    const refreshToken = TokenUtil.generateOpaqueToken();
    const hashedRefreshToken = TokenUtil.hashToken(refreshToken);
    const accessExpiresMs = 15 * 60 * 1000;
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days (or 30 if RememberMe)

    // 7. Atomic Transaction via Repository
    const sessionData: CreateSessionDTO = { ...deviceData, userId: user.id, tenantId };
    const historyData: CreateLoginHistoryDTO = {
      tenantId,
      userId: user.id,
      ipAddress: reqContext.ipAddress,
      userAgent: reqContext.userAgent,
      status: 'SUCCESS',
      loginMethod: 'LOCAL',
      authenticationProvider: 'INTERNAL'
    };

    const { session } = await this.authRepo.createSessionWithTokens(
      sessionData,
      { hashedToken: hashedRefreshToken, expiresAt: refreshExpiresAt },
      historyData
    );

    // 8. Generate Access Token (Stateless)
    const accessToken = JwtUtil.signAccessToken({
      userId: user.id,
      tenantId: user.tenantId,
      sessionId: session.id,
      tokenVersion: 1
    });

    // 9. Reset Lockout attempts & Emit Event
    await this.authRepo.recordLoginAttempt(user.id, tenantId, email, reqContext.ipAddress, true);
    this.publishEvent('AUTH_USER_LOGGED_IN', user, reqContext, { sessionId: session.id });

    // 10. Return purely data, decoupled from HTTP
    return {
      accessToken,
      refreshToken,
      session: { id: session.id, isTrustedDevice }
    };
  }

  /**
   * Flow: Hash Token -> Find -> Reuse Detection -> Rotate -> Emit -> Return
   */
  async rotateRefreshToken(
    rawOldToken: string,
    reqContext: { correlationId: string; requestId: string }
  ) {
    const hashedOldToken = TokenUtil.hashToken(rawOldToken);
    const existingData = await this.authRepo.findRefreshToken(hashedOldToken);

    // Reuse Detection
    if (!existingData) {
      throw new AuthenticationRequiredException('UNAUTHORIZED'); // Token not found at all
    }

    if (existingData.status !== 'ACTIVE') {
      // SECURITY BREACH: Token is USED or REVOKED, but someone is trying to use it again!
      await this.authRepo.markAllSessionsAndTokensRevoked(existingData.userId, 'SUSPECTED_TOKEN_THEFT');
      
      this.publishSecurityEvent('SECURITY_TOKEN_REUSE_DETECTED', { id: existingData.userId, tenantId: existingData.session.tenantId }, reqContext, {
        stolenTokenId: existingData.id,
        status: existingData.status
      });

      throw new AuthenticationRequiredException('SECURITY_VIOLATION_REUSE_DETECTED');
    }

    if (existingData.expiresAt < new Date()) {
      throw new AuthenticationRequiredException('TOKEN_EXPIRED');
    }

    // Valid Active Token -> Rotate
    const newRawToken = TokenUtil.generateOpaqueToken();
    const newHashedToken = TokenUtil.hashToken(newRawToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { newRefreshToken } = await this.authRepo.rotateRefreshToken(
      existingData.id,
      newHashedToken,
      existingData.sessionId,
      existingData.userId,
      newExpiresAt
    );

    const accessToken = JwtUtil.signAccessToken({
      userId: existingData.userId,
      tenantId: existingData.session.tenantId,
      sessionId: existingData.sessionId,
      tokenVersion: 1 // normally mapped to user.tokenVersion
    });

    this.publishEvent('AUTH_REFRESH_TOKEN_ROTATED', { id: existingData.userId, tenantId: existingData.session.tenantId }, reqContext, {
      oldTokenId: existingData.id,
      newTokenId: newRefreshToken.id,
      sessionId: existingData.sessionId
    });

    return {
      accessToken,
      refreshToken: newRawToken
    };
  }

  // Helper for Event Emission
  private publishEvent(eventName: string, user: { id: string; tenantId: string }, ctx: any, metadata: any) {
    this.eventPublisher.publish({
      eventId: TokenUtil.generateOpaqueToken().substring(0, 16),
      eventName,
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      tenantId: user.tenantId,
      userId: user.id,
      correlationId: ctx.correlationId,
      requestId: ctx.requestId,
      metadata
    });
  }

  private publishSecurityEvent(eventName: string, user: { id: string; tenantId: string }, ctx: any, metadata: any) {
    this.eventPublisher.publish({
      eventId: TokenUtil.generateOpaqueToken().substring(0, 16),
      eventName,
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      tenantId: user.tenantId,
      userId: user.id,
      correlationId: ctx.correlationId,
      requestId: ctx.requestId,
      metadata: { ...metadata, isSecurityEvent: true }
    });
  }
}
