import { PrismaClient, QuestionType, QuestionDifficulty, BloomLevel } from '@prisma/client';

export async function seedAssessment(prisma: PrismaClient) {
  console.log('Seeding Assessment Engine (Bank Soal & Ujian)...');

  const tenant = await prisma.tenant.findFirst({ where: { code: 'default-tenant' } });
  if (!tenant) throw new Error('Tenant not found');

  const teacher = await prisma.user.findFirst({ where: { tenantId: tenant.id, role: { slug: 'teacher' } } });
  const teacherProfile = teacher
    ? await prisma.teacherProfile.findFirst({ where: { tenantId: tenant.id, userId: teacher.id } })
    : null;
  const actorId = teacherProfile?.id ?? null;

  const subject = await prisma.subject.findFirst({ where: { tenantId: tenant.id } });
  const classroom = await prisma.classroom.findFirst({ where: { tenantId: tenant.id } });

  // --- 1. Categories (tree) ---
  const categories = [
    { name: 'Matematika', slug: 'matematika', description: 'Bank soal Matematika' },
    { name: 'Fisika', slug: 'fisika', description: 'Bank soal Fisika' },
    { name: 'Bahasa Indonesia', slug: 'bahasa-indonesia', description: 'Bank soal Bahasa Indonesia' },
    { name: 'Biologi', slug: 'biologi', description: 'Bank soal Biologi' },
  ];
  const categoryMap: Record<string, string> = {};
  for (const c of categories) {
    const existing = await prisma.questionCategory.findFirst({ where: { tenantId: tenant.id, slug: c.slug } });
    if (existing) {
      categoryMap[c.slug] = existing.id;
      continue;
    }
    const row = await prisma.questionCategory.create({
      data: { tenantId: tenant.id, createdById: actorId, name: c.name, slug: c.slug, description: c.description },
    });
    categoryMap[c.slug] = row.id;
  }

  const subCats = [
    { parent: 'matematika', name: 'Aljabar', slug: 'matematika-aljabar' },
    { parent: 'matematika', name: 'Geometri', slug: 'matematika-geometri' },
    { parent: 'fisika', name: 'Mekanika', slug: 'fisika-mekanika' },
    { parent: 'fisika', name: 'Listrik & Magnet', slug: 'fisika-listrik-magnet' },
    { parent: 'biologi', name: 'Sel & Jaringan', slug: 'biologi-sel' },
  ];
  for (const sc of subCats) {
    const existing = await prisma.questionCategory.findFirst({ where: { tenantId: tenant.id, slug: sc.slug } });
    if (existing) continue;
    await prisma.questionCategory.create({
      data: {
        tenantId: tenant.id,
        parentId: categoryMap[sc.parent],
        createdById: actorId,
        name: sc.name,
        slug: sc.slug,
      },
    });
  }

  // --- 2. Tags ---
  const tags = [
    { name: 'uts', slug: 'uts', color: '#ef4444' },
    { name: 'uas', slug: 'uas', color: '#f59e0b' },
    { name: 'hots', slug: 'hots', color: '#8b5cf6' },
    { name: 'literasi', slug: 'literasi', color: '#10b981' },
    { name: 'numerasi', slug: 'numerasi', color: '#3b82f6' },
  ];
  const tagMap: Record<string, string> = {};
  for (const t of tags) {
    const existing = await prisma.questionTag.findFirst({ where: { tenantId: tenant.id, slug: t.slug } });
    if (existing) {
      tagMap[t.slug] = existing.id;
      continue;
    }
    const row = await prisma.questionTag.create({
      data: { tenantId: tenant.id, createdById: actorId, name: t.name, slug: t.slug, color: t.color },
    });
    tagMap[t.slug] = row.id;
  }

  // --- 3. Questions ---
  const questions: {
    category: string;
    tags: string[];
    type: QuestionType;
    difficulty: QuestionDifficulty;
    bloomLevel: BloomLevel;
    prompt: string;
    explanation?: string;
    points?: number;
    options?: { key: string; label: string; isCorrect?: boolean }[];
    answer?: Record<string, unknown>;
  }[] = [
    {
      category: 'matematika',
      tags: ['uts', 'numerasi'],
      type: 'MULTIPLE_CHOICE',
      difficulty: 'EASY',
      bloomLevel: 'C1_REMEMBERING',
      prompt: 'Hasil dari 2x + 3x adalah...',
      explanation: '2x + 3x = 5x.',
      points: 1,
      options: [
        { key: 'a', label: '5x' },
        { key: 'b', label: '6x' },
        { key: 'c', label: '5x²' },
        { key: 'd', label: '6x²' },
      ],
      answer: { keys: ['a'] },
    },
    {
      category: 'matematika',
      tags: ['uas', 'numerasi'],
      type: 'MULTIPLE_CHOICE',
      difficulty: 'MEDIUM',
      bloomLevel: 'C3_APPLYING',
      prompt: 'Diketahui f(x) = 2x + 1. Nilai f(3) adalah...',
      explanation: 'f(3) = 2(3) + 1 = 7.',
      points: 2,
      options: [
        { key: 'a', label: '5' },
        { key: 'b', label: '6' },
        { key: 'c', label: '7' },
        { key: 'd', label: '8' },
      ],
      answer: { keys: ['c'] },
    },
    {
      category: 'matematika',
      tags: ['hots', 'numerasi'],
      type: 'NUMERIC',
      difficulty: 'HOTS',
      bloomLevel: 'C4_ANALYZING',
      prompt: 'Hitung luas lingkaran berjari-jari 7 cm (π = 22/7).',
      explanation: 'L = πr² = 22/7 × 7 × 7 = 154 cm².',
      points: 2,
      answer: { number: 154, tolerance: 0.5 },
    },
    {
      category: 'fisika',
      tags: ['uts'],
      type: 'MULTIPLE_CHOICE',
      difficulty: 'EASY',
      bloomLevel: 'C1_REMEMBERING',
      prompt: 'Satuan SI untuk gaya adalah...',
      points: 1,
      options: [
        { key: 'a', label: 'Watt' },
        { key: 'b', label: 'Newton' },
        { key: 'c', label: 'Joule' },
        { key: 'd', label: 'Pascal' },
      ],
      answer: { keys: ['b'] },
    },
    {
      category: 'fisika',
      tags: ['uas', 'hots'],
      type: 'MULTIPLE_RESPONSE',
      difficulty: 'HARD',
      bloomLevel: 'C4_ANALYZING',
      prompt: 'Pernyataan yang benar tentang Hukum Newton III: (pilih semua)',
      points: 2,
      options: [
        { key: 'a', label: 'Aksi dan reaksi besarnya sama' },
        { key: 'b', label: 'Aksi dan reaksi berlawanan arah' },
        { key: 'c', label: 'Aksi dan reaksi bekerja pada benda yang sama' },
        { key: 'd', label: 'Aksi dan reaksi bekerja pada benda yang berbeda' },
      ],
      answer: { keys: ['a', 'b', 'd'] },
    },
    {
      category: 'fisika',
      tags: ['uts'],
      type: 'TRUE_FALSE',
      difficulty: 'EASY',
      bloomLevel: 'C2_UNDERSTANDING',
      prompt: 'Kecepatan adalah besaran vektor.',
      points: 1,
      options: [
        { key: 'true', label: 'Benar' },
        { key: 'false', label: 'Salah' },
      ],
      answer: { boolean: true },
    },
    {
      category: 'bahasa-indonesia',
      tags: ['uas', 'literasi'],
      type: 'SHORT_ANSWER',
      difficulty: 'MEDIUM',
      bloomLevel: 'C2_UNDERSTANDING',
      prompt: 'Sebutkan kata baku dari kata "nasehat".',
      points: 2,
      answer: { text: 'nasihat', variants: ['nasihat'] },
    },
    {
      category: 'bahasa-indonesia',
      tags: ['uas', 'literasi'],
      type: 'ESSAY',
      difficulty: 'HARD',
      bloomLevel: 'C5_EVALUATING',
      prompt: 'Jelaskan perbedaan antara fakta dan opini beserta contohnya masing-masing!',
      points: 5,
      answer: null,
    },
    {
      category: 'biologi',
      tags: ['uts'],
      type: 'MATCHING',
      difficulty: 'MEDIUM',
      bloomLevel: 'C2_UNDERSTANDING',
      prompt: 'Pasangkan organel dengan fungsinya:',
      points: 2,
      options: [
        { key: 'm', label: 'Mitokondria' },
        { key: 'r', label: 'Ribosom' },
        { key: 'n', label: 'Nukleus' },
        { key: 'k', label: 'Kloroplas' },
      ],
      answer: {
        pairs: [
          { left: 'Mitokondria', right: 'Respirasi sel' },
          { left: 'Ribosom', right: 'Sintesis protein' },
          { left: 'Nukleus', right: 'Pusat kendali' },
          { left: 'Kloroplas', right: 'Fotosintesis' },
        ],
      },
    },
    {
      category: 'biologi',
      tags: ['uas'],
      type: 'ORDERING',
      difficulty: 'MEDIUM',
      bloomLevel: 'C3_APPLYING',
      prompt: 'Urutkan tahapan siklus sel dari awal hingga pembelahan:',
      points: 2,
      answer: { sequence: ['G1', 'S', 'G2', 'M'] },
    },
    {
      category: 'biologi',
      tags: ['hots'],
      type: 'FILL_BLANK',
      difficulty: 'MEDIUM',
      bloomLevel: 'C2_UNDERSTANDING',
      prompt: 'Organel penghasil energi (ATP) adalah ______.',
      points: 1,
      answer: { text: 'mitokondria', variants: ['mitokondria', 'mitochondria'] },
    },
  ];

  const questionMap: Record<string, string> = {};
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const existing = await prisma.assessmentQuestion.findFirst({
      where: { tenantId: tenant.id, prompt: q.prompt, deletedAt: null },
    });
    if (existing) {
      questionMap[`q${i}`] = existing.id;
      continue;
    }
    const created = await prisma.assessmentQuestion.create({
      data: {
        tenantId: tenant.id,
        categoryId: categoryMap[q.category],
        subjectId: subject?.id,
        classId: classroom?.id,
        createdById: actorId,
        type: q.type,
        difficulty: q.difficulty,
        bloomLevel: q.bloomLevel,
        status: 'PUBLISHED',
        prompt: q.prompt,
        explanation: q.explanation,
        points: q.points ?? 1,
        options: (q.options as never) ?? undefined,
        answer: q.answer ? (q.answer as never) : undefined,
        tags: { create: q.tags.map((t) => ({ tenantId: tenant.id, tagId: tagMap[t] })) },
      },
    });
    questionMap[`q${i}`] = created.id;
  }

  // --- 4. Assessment (published) ---
  const assessmentTitle = 'Ujian Formatif Fisika & Matematika';
  let assessment = await prisma.assessment.findFirst({ where: { tenantId: tenant.id, title: assessmentTitle } });
  if (!assessment) {
    assessment = await prisma.assessment.create({
      data: {
        tenantId: tenant.id,
        title: assessmentTitle,
        description: 'Ujian formatif gabungan Fisika dan Matematika.',
        instructions: 'Kerjakan dengan teliti. Waktu 45 menit.',
        status: 'PUBLISHED',
        visibility: 'CLASS',
        classId: classroom?.id,
        subjectId: subject?.id,
        teacherId: teacherProfile?.id,
        openDate: new Date('2026-08-01T00:00:00+07:00'),
        closeDate: new Date('2026-12-31T23:59:59+07:00'),
        durationMinutes: 45,
        timezone: 'Asia/Jakarta',
        attemptLimit: 3,
        passingScore: 60,
        shuffleQuestions: true,
        shuffleOptions: false,
        randomSelect: false,
        poolSource: 'MANUAL',
        showResult: true,
        showCorrectAnswer: true,
        showExplanation: true,
        allowReview: true,
        allowResume: true,
        autoSubmit: true,
        createdById: teacherProfile?.id,
      },
    });
  }

  // Attach questions (skip already-attached)
  const attachOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  for (let i = 0; i < attachOrder.length; i++) {
    const qid = questionMap[`q${attachOrder[i]}`];
    if (!qid) continue;
    const exists = await prisma.assessmentQuestionRef.findFirst({
      where: { assessmentId: assessment.id, questionId: qid },
    });
    if (exists) continue;
    await prisma.assessmentQuestionRef.create({
      data: {
        tenantId: tenant.id,
        assessmentId: assessment.id,
        questionId: qid,
        orderIndex: i,
        points: (questions[attachOrder[i]].points ?? 1) as number,
        createdById: teacherProfile?.id,
      },
    });
  }

  await prisma.assessment.update({
    where: { id: assessment.id },
    data: { maxPoints: (questions as { points?: number }[]).reduce((s, q) => s + (q.points ?? 1), 0) },
  });

  console.log(
    `✅ Assessment: ${categories.length} categories, ${subCats.length} sub-categories, ${tags.length} tags, ${questions.length} questions, assessment "${assessmentTitle}".`,
  );
}
