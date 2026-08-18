import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import prisma, { resetDatabase, disconnectDatabase } from '../../utils/db-reset';
import { measureLatency } from '../../utils/benchmark';
import { FixtureFactory } from '../../factories/fixture.factory';

describe('UserRepository Integration Tests', () => {
  let tenantId: string;
  let roleId: string;

  beforeEach(async () => {
    await resetDatabase();
    const tenant = await FixtureFactory.createTenant();
    const role = await FixtureFactory.createRole(tenant.id);
    tenantId = tenant.id;
    roleId = role.id;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('should enforce Composite Unique Constraint (tenantId + email)', async () => {
    const email = 'duplicate@test.com';

    // 1. Create first user
    await FixtureFactory.createUser(tenantId, roleId, { email });

    // 2. Attempt to create second user with same email in SAME tenant -> Must Fail
    await expect(
      FixtureFactory.createUser(tenantId, roleId, { email })
    ).rejects.toThrow(/Unique constraint failed/);

    // 3. Create second user with same email in DIFFERENT tenant -> Must Succeed
    const tenant2 = await FixtureFactory.createTenant();
    const role2 = await FixtureFactory.createRole(tenant2.id);
    const userDifferentTenant = await FixtureFactory.createUser(tenant2.id, role2.id, { email });
    
    expect(userDifferentTenant.id).toBeDefined();
  });

  it('should enforce Optimistic Concurrency Control (OCC)', async () => {
    const user = await FixtureFactory.createUser(tenantId, roleId);
    
    // Simulate Admin A and Admin B reading the same record
    const versionAdminA = user.version; // 1
    const versionAdminB = user.version; // 1

    // Admin A updates successfully
    const updateA = await prisma.user.updateMany({
      where: { id: user.id, version: versionAdminA },
      data: { status: 'SUSPENDED', version: { increment: 1 } }
    });
    expect(updateA.count).toBe(1);

    // Admin B tries to update using the old version -> Must Fail (Count 0)
    const updateB = await prisma.user.updateMany({
      where: { id: user.id, version: versionAdminB },
      data: { status: 'ARCHIVED', version: { increment: 1 } }
    });
    expect(updateB.count).toBe(0);

    // Verify database reflects Admin A's changes
    const finalUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(finalUser.status).toBe('SUSPENDED');
    expect(finalUser.version).toBe(2);
  });

  it('should respect Soft Delete isolation', async () => {
    const user1 = await FixtureFactory.createUser(tenantId, roleId);
    const user2 = await FixtureFactory.createUser(tenantId, roleId);

    // Soft delete user1
    await prisma.user.update({
      where: { id: user1.id },
      data: { deletedAt: new Date() }
    });

    // Application Query (Simulating Repository findMany)
    const { result, durationMs } = await measureLatency(
      'Find Active Users',
      () => prisma.user.findMany({ where: { tenantId, deletedAt: null } }),
      50 // Benchmark target < 50ms
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(user2.id);

    // Administrative Query (Checking soft deleted existence)
    const adminQuery = await prisma.user.findMany({ where: { tenantId } });
    expect(adminQuery).toHaveLength(2);
  });
});
