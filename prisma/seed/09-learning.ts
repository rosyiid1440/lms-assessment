import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

export async function seedLearning(prisma: PrismaClient) {
  console.log('Seeding Learning Contents...');

  const tenant = await prisma.tenant.findFirst({ where: { code: 'default-tenant' }});
  if (!tenant) throw new Error('Tenant not found');

  const courses = await prisma.course.findMany({ where: { tenantId: tenant.id }, take: 2 });
  if (courses.length < 2) {
    console.log('Not enough courses to seed learning materials. Need at least 2.');
    return;
  }

  // Clear previous
  await prisma.chapter.deleteMany({});

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];

    // 2 Chapters per course
    for (let c = 1; c <= 2; c++) {
      const chapter = await prisma.chapter.create({
        data: {
          tenantId: tenant.id,
          courseId: course.id,
          title: `Bab ${c}: Pengantar Materi ${c}`,
          description: 'Deskripsi bab ini',
          order: c
        }
      });

      // 3 Lessons per chapter (total 12 lessons across 2 courses * 2 chapters)
      for (let l = 1; l <= 3; l++) {
        const lesson = await prisma.lesson.create({
          data: {
            tenantId: tenant.id,
            chapterId: chapter.id,
            title: `Pertemuan ${l}`,
            description: 'Materi pertemuan',
            order: l,
            estimatedDuration: 45,
            status: 'PUBLISHED'
          }
        });

        // 2-3 Materials per lesson (approx 30 total)
        for (let m = 1; m <= 3; m++) {
          // Types: HTML, PDF, VIDEO
          const type = m === 1 ? 'HTML' : (m === 2 ? 'PDF' : 'VIDEO');
          
          const material = await prisma.material.create({
            data: {
              tenantId: tenant.id,
              lessonId: lesson.id,
              type: type as any,
              order: m
            }
          });

          const version = await prisma.materialVersion.create({
            data: {
              tenantId: tenant.id,
              materialId: material.id,
              title: `${type} Material - ${m}`,
              searchableContent: type === 'HTML' ? '<p>Ini teks konten materi</p>' : 'https://example.com/file',
              contentHash: crypto.createHash('sha256').update(`${type}-${m}-${lesson.id}`).digest('hex'),
              versionNumber: 1
            }
          });

          // Publish material
          await prisma.material.update({
            where: { id: material.id },
            data: { currentVersionId: version.id }
          });
        }
      }
    }
  }

  console.log('✅ Learning Contents Seeded.');
}
