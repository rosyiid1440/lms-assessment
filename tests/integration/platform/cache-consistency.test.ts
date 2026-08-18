import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import prisma, { resetDatabase, disconnectDatabase } from '../../utils/db-reset';
import { MemoryEventBus } from '../../../server/src/core/infrastructure/events/event-bus';
import { OutboxWorker } from '../../../server/src/core/infrastructure/events/outbox.worker';
import { MemoryCacheProvider } from '../../../server/src/core/infrastructure/cache/cache.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mocking the Permission Evaluator behavior utilizing the new Generic Cache
 */
class MockPermissionEvaluator {
  constructor(private cache: MemoryCacheProvider<boolean>) {}

  async hasPermission(roleId: string, permission: string): Promise<boolean> {
    const cacheKey = `perm:${roleId}:${permission}`;
    const cached = await this.cache.get(cacheKey);
    
    if (cached !== null) return cached;

    // Cache Miss -> Fallback to DB
    const dbValue = await this.queryDatabase(roleId, permission);
    
    // Save to cache with Tag
    await this.cache.set(cacheKey, dbValue, 60000, [`role:${roleId}`]);
    return dbValue;
  }

  private async queryDatabase(roleId: string, permission: string): Promise<boolean> {
    const role = await prisma.role.findUnique({ where: { id: roleId }, include: { permissions: { include: { permission: true } } } });
    if (!role) return false;
    return role.permissions.some(rp => rp.permission.slug === permission);
  }
}

describe('Gate 12: Cache & Eventual Consistency Pipeline', () => {
  let eventBus: MemoryEventBus;
  let outboxWorker: OutboxWorker;
  let cache: MemoryCacheProvider<boolean>;
  let evaluator: MockPermissionEvaluator;

  let tenantId: string;
  let roleId: string;
  let permId: string;

  beforeEach(async () => {
    await resetDatabase();
    
    eventBus = new MemoryEventBus();
    cache = new MemoryCacheProvider<boolean>();
    evaluator = new MockPermissionEvaluator(cache);

    // Setup Outbox Worker with short interval for testing
    outboxWorker = new OutboxWorker(prisma, eventBus);
    
    // Seed initial data
    const tenant = await prisma.tenant.create({ data: { name: 'Test', code: `T-${uuidv4()}`, status: 'ACTIVE' } });
    tenantId = tenant.id;

    const role = await prisma.role.create({ data: { tenantId, name: 'Admin', slug: 'admin' } });
    roleId = role.id;

    const perm = await prisma.permission.create({ data: { module: 'users', action: 'read', slug: 'users:read' } });
    permId = perm.id;

    // Wire up Cache Invalidation Listener
    eventBus.subscribe('identity.role_updated', async (event: any) => {
      await cache.invalidateByTag(`role:${event.metadata.roleId}`);
    });
  });

  afterEach(() => {
    outboxWorker.stop();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('Scenario 1 & 2: Update -> Outbox -> Worker -> Invalidate Cache -> New Read', async () => {
    // 1. Initial Cache Miss -> Hits DB -> Returns False (no permission assigned yet)
    const result1 = await evaluator.hasPermission(roleId, 'users:read');
    expect(result1).toBe(false);

    // 2. Cache Hit -> Still False
    const result2 = await evaluator.hasPermission(roleId, 'users:read');
    expect(result2).toBe(false);

    // 3. Transaction: Assign Permission AND write to Outbox
    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.create({ data: { roleId, permissionId: permId } });
      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventType: 'identity.role_updated',
          aggregateType: 'Role',
          aggregateId: roleId,
          payload: {
            eventName: 'identity.role_updated',
            metadata: { roleId }
          }
        }
      });
    });

    // 4. Start Worker to process the Outbox
    outboxWorker.start(100);

    // Wait for eventual consistency (Polling + Processing delay)
    await new Promise(resolve => setTimeout(resolve, 300));

    // 5. Worker should have cleared the cache via the EventBus subscription
    // The next read should be a Cache Miss -> Hits DB -> Returns True
    const result3 = await evaluator.hasPermission(roleId, 'users:read');
    expect(result3).toBe(true);
  });

  it('Scenario 3: Outbox Resume on Worker Crash/Restart', async () => {
    // Write outbox event while worker is DEAD
    await prisma.outboxEvent.create({
      data: {
        tenantId,
        eventType: 'identity.role_updated',
        aggregateType: 'Role',
        aggregateId: roleId,
        payload: { eventName: 'identity.role_updated', metadata: { roleId } }
      }
    });

    // Simulate worker crashing/being offline
    await new Promise(resolve => setTimeout(resolve, 500));

    // Restart worker
    outboxWorker.start(100);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Outbox event must have been processed
    const outboxCount = await prisma.outboxEvent.count({ where: { status: 'PUBLISHED' } });
    expect(outboxCount).toBe(1);
  });

  it('Scenario 5 (Negative Test): Tx Rollback prevents Outbox Emission & Cache Change', async () => {
    // Prime the cache
    await evaluator.hasPermission(roleId, 'users:read'); // sets false in cache

    try {
      // Intentional failure inside transaction
      await prisma.$transaction(async (tx) => {
        await tx.rolePermission.create({ data: { roleId, permissionId: permId } });
        
        await tx.outboxEvent.create({
          data: {
            tenantId, eventType: 'identity.role_updated', aggregateType: 'Role',
            aggregateId: roleId, payload: { eventName: 'identity.role_updated', metadata: { roleId } }
          }
        });

        throw new Error('Intentional Rollback'); // BOOM!
      });
    } catch (e) {
      // Ignored
    }

    outboxWorker.start(100);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Cache should remain Stale (False) because Event was never published
    const result = await evaluator.hasPermission(roleId, 'users:read');
    expect(result).toBe(false);

    // Outbox must be empty
    const count = await prisma.outboxEvent.count();
    expect(count).toBe(0);
  });
});
