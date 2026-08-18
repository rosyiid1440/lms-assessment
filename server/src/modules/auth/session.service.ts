import { ISessionRepository } from './repository.interface';
import { IEventPublisher, ReadonlyDomainEvent } from './auth.service';
import { TokenUtil } from '../../shared/utils/token.util';

export class SessionService {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async getActiveSessions(userId: string) {
    // In real implementation, this maps Prisma models to Domain DTOs
    return this.sessionRepo.findActiveSessionsByUserId(userId);
  }

  async revokeSession(sessionId: string, userId: string, tenantId: string, reqContext: any) {
    const session = await this.sessionRepo.findSessionById(sessionId);
    if (!session || session.userId !== userId) {
      throw new Error('SESSION_NOT_FOUND');
    }

    await this.sessionRepo.revokeSession(sessionId);

    this.eventPublisher.publish({
      eventId: TokenUtil.generateOpaqueToken().substring(0, 16),
      eventName: 'AUTH_SESSION_REVOKED',
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      tenantId,
      userId,
      correlationId: reqContext.correlationId,
      requestId: reqContext.requestId,
      metadata: { sessionId, reason: 'USER_INITIATED' }
    });
  }

  async revokeAllSessions(userId: string, tenantId: string, reqContext: any) {
    await this.sessionRepo.revokeAllSessions(userId);

    this.eventPublisher.publish({
      eventId: TokenUtil.generateOpaqueToken().substring(0, 16),
      eventName: 'AUTH_ALL_SESSIONS_REVOKED',
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      tenantId,
      userId,
      correlationId: reqContext.correlationId,
      requestId: reqContext.requestId,
      metadata: { reason: 'USER_INITIATED' }
    });
  }

  async updateActivity(sessionId: string) {
    await this.sessionRepo.updateSessionActivity(sessionId, new Date());
  }
}
