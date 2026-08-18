import prisma from '../utils/db-reset';
import { v4 as uuidv4 } from 'uuid';

export const FixtureFactory = {
  async createTenant() {
    return prisma.tenant.create({
      data: {
        name: 'Test Tenant',
        code: `test-tenant-${uuidv4().substring(0, 8)}`,
        status: 'ACTIVE',
      },
    });
  },

  async createRole(tenantId: string) {
    return prisma.role.create({
      data: {
        tenantId,
        name: 'Test Role',
        slug: `test-role-${uuidv4().substring(0, 8)}`,
      },
    });
  },

  async createUser(tenantId: string, roleId: string, overrides: any = {}) {
    return prisma.user.create({
      data: {
        tenantId,
        roleId,
        email: `test-${uuidv4().substring(0, 8)}@example.com`,
        passwordHash: 'hashed_pw_mock',
        status: 'ACTIVE',
        ...overrides,
      },
    });
  }
};
