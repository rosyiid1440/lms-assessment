import { PrismaClient } from '@prisma/client';
import { HashUtil } from '../../server/src/shared/utils/hash.util';
import { faker } from '@faker-js/faker';

export async function seedTeachers(prisma: PrismaClient) {
  console.log('Seeding 30 Dummy Teachers...');

  // Clean up
  await prisma.courseCoTeacher.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.teacherProfile.deleteMany({});

  const tenant = await prisma.tenant.findFirst({ where: { code: 'default-tenant' }});
  if (!tenant) throw new Error('Tenant not found');

  const teacherRole = await prisma.role.findFirst({ where: { tenantId: tenant.id, slug: 'teacher' }});
  if (!teacherRole) throw new Error('Teacher role not found');

  const defaultPassword = await HashUtil.hash('password123');
  const specializations = ['Mathematics', 'Physics', 'Biology', 'History', 'English', 'Physical Education', 'Computer Science'];

  let currentNip = 198001012005011000; // Fake base NIP

  for (let i = 0; i < 30; i++) {
    const gender = i % 2 === 0 ? 'MALE' : 'FEMALE';
    const firstName = faker.person.firstName(gender === 'MALE' ? 'male' : 'female');
    const lastName = faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;
    const nip = (currentNip + i).toString();
    const email = `teacher${i}@sman1.sch.id`;

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email } },
        update: {},
        create: {
          tenantId: tenant.id,
          email,
          passwordHash: defaultPassword,
          roleId: teacherRole.id,
          status: 'ACTIVE'
        }
      });

      await tx.teacherProfile.upsert({
        where: { tenantId_nip: { tenantId: tenant.id, nip } },
        update: {},
        create: {
          tenantId: tenant.id,
          userId: user.id,
          nip,
          nuptk: `987654321${i.toString().padStart(3, '0')}`,
          fullName,
          gender,
          birthPlace: faker.location.city(),
          birthDate: faker.date.birthdate({ min: 25, max: 60, mode: 'age' }),
          religion: 'Islam',
          phone: faker.string.numeric(12),
          address: faker.location.streetAddress(),
          specialization: specializations[Math.floor(Math.random() * specializations.length)]
        }
      });
    });
  }

  console.log('✅ 30 Teachers Seeded.');
}
