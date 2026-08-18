import { PrismaClient } from '@prisma/client';

export async function seedAcademicMaster(prisma: PrismaClient) {
  console.log('Seeding Academic Master Data...');
  
  const tenant = await prisma.tenant.findFirst({ where: { code: 'default-tenant' }});
  if (!tenant) throw new Error('Tenant not found');

  // Grade Levels
  const grades = [
    { level: 10, phase: 'E' },
    { level: 11, phase: 'F' },
    { level: 12, phase: 'F' }
  ];

  for (const g of grades) {
    await prisma.gradeLevel.upsert({
      where: { tenantId_level: { tenantId: tenant.id, level: g.level } },
      update: {},
      create: { tenantId: tenant.id, level: g.level, phase: g.phase }
    });
  }

  // Majors
  const majors = [
    { code: 'MIPA', name: 'Matematika dan Ilmu Pengetahuan Alam' },
    { code: 'IPS', name: 'Ilmu Pengetahuan Sosial' },
    { code: 'BAHASA', name: 'Ilmu Bahasa dan Budaya' },
    { code: 'UMUM', name: 'Kurikulum Merdeka Umum' }
  ];

  for (const m of majors) {
    await prisma.major.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: m.code } },
      update: {},
      create: { tenantId: tenant.id, code: m.code, name: m.name }
    });
  }

  // Classrooms
  for (let i = 1; i <= 5; i++) {
    await prisma.classroom.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: `R-${100+i}` } },
      update: {},
      create: { tenantId: tenant.id, code: `R-${100+i}`, name: `Ruang ${100+i}`, capacity: 36 }
    });
  }

  // Academic Year
  const year = await prisma.academicYear.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: '2026/2027' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: '2026/2027',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2027-06-30'),
      status: 'ACTIVE'
    }
  });

  // Semester ODD
  await prisma.semester.upsert({
    where: { academicYearId_type: { academicYearId: year.id, type: 'ODD' } },
    update: {},
    create: {
      tenantId: tenant.id,
      academicYearId: year.id,
      name: 'Ganjil 2026/2027',
      type: 'ODD',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-12-31'),
      status: 'RUNNING'
    }
  });

  console.log('✅ Academic Master Data Seeded.');
}
