import { PrismaClient } from '@prisma/client';

export async function seedRolesAndPermissions(prisma: PrismaClient) {
  console.log('🌱 Seeding Roles & Permissions...');
  const tenantId = '00000000-0000-0000-0000-000000000000';

  // 1. Roles
  const roles = [
    { slug: 'super_admin', name: 'Super Administrator', isSystem: true },
    { slug: 'principal', name: 'Principal / Kepala Sekolah', isSystem: true },
    { slug: 'teacher', name: 'Teacher / Guru', isSystem: true },
    { slug: 'student', name: 'Student / Siswa', isSystem: true },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { tenantId_slug: { tenantId, slug: r.slug } },
      update: {},
      create: { ...r, tenantId }
    });
  }

  // 2. Mock Permissions
  const perms = [
    { slug: 'users:read', module: 'users', action: 'read' },
    { slug: 'users:write', module: 'users', action: 'write' },
    { slug: 'grades:publish', module: 'grades', action: 'publish' },
  ];

  for (const p of perms) {
    await prisma.permission.upsert({
      where: { slug: p.slug },
      update: {},
      create: p
    });
  }
}
