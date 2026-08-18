import { PrismaClient } from '@prisma/client';
import { HashUtil } from '../../server/src/shared/utils/hash.util';
import { faker } from '@faker-js/faker';

export async function seedStudents(prisma: PrismaClient) {
  console.log('Seeding 30 Dummy Students...');

  // Clean up existing to prevent unique constraint issues on re-run
  await prisma.studentEnrollment.deleteMany({});
  await prisma.studentProfile.deleteMany({});

  const tenant = await prisma.tenant.findFirst({ where: { code: 'default-tenant' }});
  if (!tenant) throw new Error('Tenant not found');

  const activeSemester = await prisma.semester.findFirst({
    where: { tenantId: tenant.id, status: 'RUNNING' }
  });
  if (!activeSemester) throw new Error('Running semester not found');

  const studentRole = await prisma.role.findFirst({ where: { tenantId: tenant.id, slug: 'student' }});
  if (!studentRole) throw new Error('Student role not found');

  const classes = await prisma.class.findMany({
    where: { tenantId: tenant.id, semesterId: activeSemester.id }
  });

  if (classes.length === 0) {
    console.log('No classes found for active semester. Creating a dummy class...');
    // We assume major and gradeLevel exist from 04-academic-master
    const gradeLevel = await prisma.gradeLevel.findFirst({ where: { tenantId: tenant.id } });
    const major = await prisma.major.findFirst({ where: { tenantId: tenant.id } });
    if (!gradeLevel || !major) throw new Error('Master data (grade/major) missing');

    const newClass = await prisma.class.create({
      data: {
        tenantId: tenant.id,
        semesterId: activeSemester.id,
        gradeLevelId: gradeLevel.id,
        majorId: major.id,
        name: '10 MIPA 1',
        code: '10-MIPA-1'
      }
    });
    classes.push(newClass);
  }

  // Pre-calculate hash for "password123" to save time
  const defaultPassword = await HashUtil.hash('password123');

  let currentNis = 10000;

  for (let i = 0; i < 30; i++) {
    const gender = i % 2 === 0 ? 'MALE' : 'FEMALE';
    const firstName = faker.person.firstName(gender === 'MALE' ? 'male' : 'female');
    const lastName = faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;
    const nis = (currentNis + i).toString();
    const email = `${nis}@student.sch.id`;

    // Pick random class
    const assignedClass = classes[Math.floor(Math.random() * classes.length)];

    await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email } },
        update: {},
        create: {
          tenantId: tenant.id,
          email,
          passwordHash: defaultPassword,
          roleId: studentRole.id,
          status: 'ACTIVE'
        }
      });

      // Create profile
      const profile = await tx.studentProfile.upsert({
        where: { tenantId_nis: { tenantId: tenant.id, nis } },
        update: {},
        create: {
          tenantId: tenant.id,
          userId: user.id,
          nis,
          nisn: `00${nis}123`,
          fullName,
          gender,
          birthPlace: faker.location.city(),
          birthDate: faker.date.birthdate({ min: 14, max: 18, mode: 'age' }),
          religion: 'Islam',
          phone: faker.string.numeric(12),
          parentName: faker.person.fullName(),
          parentPhone: faker.string.numeric(12)
        }
      });

      // Create enrollment
      await tx.studentEnrollment.create({
        data: {
          tenantId: tenant.id,
          studentId: profile.id,
          classId: assignedClass.id,
          semesterId: activeSemester.id,
          status: 'ACTIVE'
        }
      });
    });
  }

  console.log('✅ 30 Students Seeded.');
}
