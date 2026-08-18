import { PrismaClient } from '@prisma/client';
import { HashUtil } from '../../server/src/shared/utils/hash.util';

export async function seedAdmin(prisma: PrismaClient) {
  console.log('Seeding Super Admin...');
  
  const tenant = await prisma.tenant.findFirst({ where: { code: 'default-tenant' }});
  if (!tenant) throw new Error('Tenant not found. Run tenant seed first.');

  const superAdminRole = await prisma.role.findFirst({ where: { slug: 'super_admin' }});
  if (!superAdminRole) throw new Error('Role not found. Run role seed first.');

  const existing = await prisma.user.findFirst({ where: { email: 'admin@sman1.sch.id' } });
  
  if (existing) {
    console.log('Super Admin already exists. Deleting to recreate with correct hash...');
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const passwordHash = await HashUtil.hash('admin123');

  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@sman1.sch.id',
      passwordHash: passwordHash,
      roleId: superAdminRole.id,
      status: 'ACTIVE'
    }
  });

  console.log(`Created Super Admin: ${admin.email} / admin123`);
}
