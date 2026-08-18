import { PrismaClient } from '@prisma/client';

export async function seedEnrollmentsVariations(prisma: PrismaClient) {
  console.log('Generating Enrollment Variations (TRANSFERRED, GRADUATED, WITHDRAWN)...');

  const tenant = await prisma.tenant.findFirst({ where: { code: 'default-tenant' }});
  if (!tenant) throw new Error('Tenant not found');

  // Get active enrollments to modify
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { tenantId: tenant.id, status: 'ACTIVE' },
    take: 10 // We'll modify the first 10
  });

  if (enrollments.length < 10) {
    console.log('Not enough enrollments to create variations. Skip.');
    return;
  }

  // 1-3: TRANSFERRED
  for(let i=0; i<3; i++) {
    await prisma.studentEnrollment.update({
      where: { id: enrollments[i].id },
      data: { status: 'TRANSFERRED' }
    });
  }

  // 4-6: GRADUATED
  for(let i=3; i<6; i++) {
    await prisma.studentEnrollment.update({
      where: { id: enrollments[i].id },
      data: { status: 'GRADUATED' }
    });
  }

  // 7-9: WITHDRAWN
  for(let i=6; i<9; i++) {
    await prisma.studentEnrollment.update({
      where: { id: enrollments[i].id },
      data: { status: 'WITHDRAWN' }
    });
  }

  console.log('✅ Enrollment variations created.');
}
