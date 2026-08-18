import { PrismaClient } from '@prisma/client';

export async function seedCourses(prisma: PrismaClient) {
  console.log('Seeding Subjects and Courses...');

  await prisma.courseCoTeacher.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.subject.deleteMany({});

  const tenant = await prisma.tenant.findFirst({ where: { code: 'default-tenant' }});
  if (!tenant) throw new Error('Tenant not found');

  // Subjects
  const subjectsData = [
    { code: 'MAT-W', name: 'Matematika Wajib', group: 'Muatan Nasional' },
    { code: 'BIN-W', name: 'Bahasa Indonesia', group: 'Muatan Nasional' },
    { code: 'FIS-P', name: 'Fisika Peminatan', group: 'Peminatan MIPA' },
    { code: 'BIO-P', name: 'Biologi Peminatan', group: 'Peminatan MIPA' },
  ];

  const subjects = [];
  for (const s of subjectsData) {
    const subj = await prisma.subject.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: s.code } },
      update: {},
      create: { tenantId: tenant.id, code: s.code, name: s.name, group: s.group }
    });
    subjects.push(subj);
  }

  // Get active semester, classes, teachers
  const semester = await prisma.semester.findFirst({ where: { tenantId: tenant.id, status: 'RUNNING' }});
  const classes = await prisma.class.findMany({ where: { tenantId: tenant.id, semesterId: semester!.id }});
  const teachers = await prisma.teacherProfile.findMany({ where: { tenantId: tenant.id }, take: 10 });

  if (!semester || classes.length === 0 || teachers.length < 2) {
    console.log('Cannot seed courses: missing semester, classes, or teachers');
    return;
  }

  // Create Courses
  for (let i = 0; i < classes.length; i++) {
    for (let j = 0; j < 3; j++) {
      const subject = subjects[j % subjects.length];
      const primaryTeacher = teachers[(i + j) % teachers.length];
      
      const course = await prisma.course.create({
        data: {
          tenantId: tenant.id,
          academicYearId: semester.academicYearId,
          semesterId: semester.id,
          subjectId: subject.id,
          classId: classes[i].id,
          primaryTeacherId: primaryTeacher.id,
          status: 'ACTIVE'
        }
      });

      // Add Co-Teacher occasionally
      if (j % 2 === 0) {
        const coTeacher = teachers[(i + j + 1) % teachers.length];
        await prisma.courseCoTeacher.create({
          data: {
            courseId: course.id,
            teacherId: coTeacher.id,
            role: 'ASSISTANT'
          }
        });
      }
    }
  }

  console.log('✅ Subjects and Courses Seeded.');
}
