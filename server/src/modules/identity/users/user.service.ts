import { IUserRepository } from './repositories/user.repository';
import { UserMapper, UserDetailDTO } from './user.mapper';
import { UserStateMachine } from './user.state-machine';
import { IDENTITY_EVENTS, UserDomainEvent } from './user.events';
import { HashUtil } from '../../../shared/utils/hash.util';
import { IEventPublisher } from '../../authorization/service'; // Assuming abstract publisher exists
import { IRequestContext } from '../../../core/context/request-context.service';
import { 
  ConflictException, 
  ResourceNotFoundException, 
  BusinessRuleException 
} from '../../../core/exceptions/app.exception';
import { CreateUserDTO, UserStatus } from './dtos/user.dto';

export class UserService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly eventPublisher: IEventPublisher
  ) {}

  // ----------------------------------------------------------------
  // CORE OPERATIONS
  // ----------------------------------------------------------------

  async createUser(data: CreateUserDTO, ctx: IRequestContext): Promise<UserDetailDTO> {
    // 1. Business Rule: Unique Email Validation
    const existing = await this.userRepository.findByEmail(data.email, data.tenantId);
    if (existing) {
      throw new ConflictException(`User with email ${data.email} already exists.`);
    }

    // 2. Hash Password (Service is the only place allowed to do this)
    const passwordHash = await HashUtil.hash(data.passwordHash);

    // 3. Create (Transaction Boundary starts at Repository)
    const newUser = await this.userRepository.create({
      ...data,
      passwordHash,
    });

    // 4. Publish Immutable Domain Event
    this.publishEvent(IDENTITY_EVENTS.USER_CREATED, newUser, ctx);

    return newUser;
  }

  // ----------------------------------------------------------------
  // STATE MACHINE TRANSITIONS
  // ----------------------------------------------------------------

  async activateUser(userId: string, expectedUpdatedAt: Date, ctx: IRequestContext): Promise<void> {
    await this.transitionStatus(userId, 'ACTIVE', expectedUpdatedAt, ctx, IDENTITY_EVENTS.USER_ACTIVATED);
  }

  async suspendUser(userId: string, reason: string, expectedUpdatedAt: Date, ctx: IRequestContext): Promise<void> {
    await this.transitionStatus(userId, 'SUSPENDED', expectedUpdatedAt, ctx, IDENTITY_EVENTS.USER_SUSPENDED, reason);
  }

  async archiveUser(userId: string, reason: string, expectedUpdatedAt: Date, ctx: IRequestContext): Promise<void> {
    await this.transitionStatus(userId, 'ARCHIVED', expectedUpdatedAt, ctx, IDENTITY_EVENTS.USER_ARCHIVED, reason);
    // Note: A real implementation would also cascade Soft Delete via repository here
  }

  async restoreUser(userId: string, expectedUpdatedAt: Date, ctx: IRequestContext): Promise<void> {
    await this.transitionStatus(userId, 'ACTIVE', expectedUpdatedAt, ctx, IDENTITY_EVENTS.USER_RESTORED);
  }

  // ----------------------------------------------------------------
  // PASSWORD MANAGEMENT
  // ----------------------------------------------------------------

  async forcePasswordChange(userId: string, newPasswordRaw: string, ctx: IRequestContext): Promise<void> {
    const user = await this.getUserOrFail(userId, ctx.identity?.tenantId!);
    
    // Business Validation: Cannot change password for archived users
    if (user.status === 'ARCHIVED') {
      throw new BusinessRuleException('Cannot change password for archived users.');
    }

    const newHash = await HashUtil.hash(newPasswordRaw);
    
    // Abstracting raw DB update, assuming repository has this
    // await this.userRepository.updatePassword(userId, ctx.identity!.tenantId, newHash);

    this.publishEvent(IDENTITY_EVENTS.PASSWORD_CHANGED, user, ctx, 'Forced by Administrator');
  }

  // ----------------------------------------------------------------
  // PRIVATE HELPERS
  // ----------------------------------------------------------------

  /**
   * Universal status transition handler with OCC (Optimistic Concurrency Control)
   */
  private async transitionStatus(
    userId: string, 
    nextStatus: UserStatus, 
    expectedUpdatedAt: Date, 
    ctx: IRequestContext,
    eventName: string,
    reason?: string
  ): Promise<void> {
    const tenantId = ctx.identity?.tenantId;
    if (!tenantId) throw new BusinessRuleException('Tenant Context Missing');

    const user = await this.getUserOrFail(userId, tenantId);

    // 1. Optimistic Concurrency Check (Lost Update Prevention)
    if (user.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      throw new ConflictException('The user record was modified by another administrator. Please refresh and try again.');
    }

    // 2. State Machine Validation
    UserStateMachine.validateTransition(user.status, nextStatus);

    // 3. Persist Transition
    await this.userRepository.updateStatus(userId, tenantId, nextStatus);

    // 4. Update the object for event emission
    user.status = nextStatus;
    
    // 5. Emit Event
    this.publishEvent(eventName, user, ctx, reason);
  }

  private async getUserOrFail(userId: string, tenantId: string): Promise<UserDetailDTO> {
    const user = await this.userRepository.findById(userId, tenantId);
    if (!user) {
      throw new ResourceNotFoundException('User', userId);
    }
    return user;
  }

  private publishEvent(eventName: string, user: UserDetailDTO, ctx: IRequestContext, reason?: string): void {
    const event: UserDomainEvent = {
      eventId: require('crypto').randomUUID(),
      eventName,
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      tenantId: user.tenantId,
      userId: ctx.identity?.userId,
      correlationId: ctx.correlationId,
      requestId: ctx.requestId,
      metadata: {
        userId: user.id,
        email: user.email,
        roleId: user.roleId,
        status: user.status,
        reason,
        changedBy: ctx.identity?.userId,
      }
    };

    this.eventPublisher.publish(event);
  }
}
