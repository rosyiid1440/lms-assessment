import { PrismaClient, Prisma } from '@prisma/client';
import type {
  PaginationRequest,
  SortRequest,
  PaginatedResult,
  AssessmentSummary,
  AssessmentDTO,
  AssessmentCreateDTO,
  AttemptDTO,
  ResultDTO,
  AnalyticsDTO,
} from '../dtos/assessment.dto';

export interface AssessmentFilters {
  tenantId: string;
  search?: string;
  status?: string;
  classId?: string;
  courseId?: string;
  subjectId?: string;
}

export interface IAssessmentRepository {
  list(filter: AssessmentFilters, pagination: PaginationRequest, sort: SortRequest): Promise<PaginatedResult<AssessmentSummary>>;
  findById(id: string, tenantId: string): Promise<AssessmentDTO | null>;
  create(data: AssessmentCreateDTO): Promise<AssessmentDTO>;
  update(id: string, tenantId: string, data: Partial<AssessmentCreateDTO>): Promise<AssessmentDTO | null>;
  softDelete(id: string, tenantId: string, deletedById: string): Promise<boolean>;
  setStatus(id: string, tenantId: string, status: string, updatedById: string): Promise<AssessmentDTO | null>;
  attachQuestions(assessmentId: string, tenantId: string, questionIds: string[], points?: number, pointsMap?: Record<string, number>): Promise<void>;
  removeQuestion(assessmentId: string, questionId: string, tenantId: string): Promise<boolean>;
  updateQuestionPoints(assessmentId: string, questionId: string, tenantId: string, points: number): Promise<boolean>;
  balancePoints(assessmentId: string, tenantId: string, totalPoints: number): Promise<void>;
  addPoolRule(assessmentId: string, tenantId: string, data: any): Promise<void>;
  removePoolRule(ruleId: string, tenantId: string): Promise<boolean>;
  listForStudent(tenantId: string, studentId: string, pagination: PaginationRequest): Promise<PaginatedResult<AssessmentSummary>>;
  listEnrolledStudents(tenantId: string, classId: string): Promise<Array<{ id: string; fullName: string; nis: string; nisn: string }>>;
  getStudentProfiles(tenantId: string, studentIds: string[]): Promise<Array<{ id: string; fullName: string; nis: string; nisn: string }>>;
}

const assessmentInclude = {
  questions: {
    orderBy: { orderIndex: 'asc' },
    include: {
      question: {
        include: {
          category: { select: { id: true, name: true } },
          tags: { select: { tag: { select: { id: true, name: true, slug: true, color: true } } } },
          activeVersion: { select: { id: true, versionNumber: true } },
        },
      },
    },
  },
  poolRules: { orderBy: { orderIndex: 'asc' } },
  _count: { select: { attempts: true } },
} satisfies Prisma.AssessmentInclude;

export class PrismaAssessmentRepository implements IAssessmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(filter: AssessmentFilters, pagination: PaginationRequest, sort: SortRequest): Promise<PaginatedResult<AssessmentSummary>> {
    const where: Prisma.AssessmentWhereInput = { tenantId: filter.tenantId, deletedAt: null };
    if (filter.search) where.title = { contains: filter.search, mode: 'insensitive' };
    if (filter.status) where.status = filter.status as never;
    if (filter.classId) where.classId = filter.classId;
    if (filter.courseId) where.courseId = filter.courseId;
    if (filter.subjectId) where.subjectId = filter.subjectId;

    const sortable = ['updatedAt', 'createdAt', 'title', 'status'].includes(sort.sortBy) ? sort.sortBy : 'updatedAt';
    const skip = (pagination.page - 1) * pagination.limit;

    const [total, rows] = await Promise.all([
      this.prisma.assessment.count({ where }),
      this.prisma.assessment.findMany({
        where,
        include: {
          _count: { select: { questions: true, attempts: true, results: true } },
        },
        skip,
        take: pagination.limit,
        orderBy: { [sortable]: sort.sortDir },
      }),
    ]);

    return {
      data: rows.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        status: a.status,
        classId: a.classId,
        courseId: a.courseId,
        subjectId: a.subjectId,
        openDate: a.openDate,
        closeDate: a.closeDate,
        durationMinutes: a.durationMinutes,
        attemptLimit: a.attemptLimit,
        maxPoints: a.maxPoints,
        questionCount: a._count.questions,
        attemptCount: a._count.attempts,
        submittedCount: a._count.results,
        passingScore: a.passingScore,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
      meta: { total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) },
    };
  }

  async findById(id: string, tenantId: string): Promise<AssessmentDTO | null> {
    const a = await this.prisma.assessment.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: assessmentInclude,
    });
    if (!a) return null;
    return this.mapDetail(a);
  }

  async create(data: AssessmentCreateDTO): Promise<AssessmentDTO> {
    const a = await this.prisma.assessment.create({
      data: {
        tenantId: data.tenantId,
        title: data.title,
        description: data.description ?? null,
        instructions: data.instructions ?? null,
        status: (data.status ?? 'DRAFT') as never,
        visibility: (data.visibility ?? 'CLASS') as never,
        courseId: data.courseId ?? null,
        classId: data.classId ?? null,
        subjectId: data.subjectId ?? null,
        teacherId: data.teacherId ?? null,
        openDate: data.openDate ?? null,
        closeDate: data.closeDate ?? null,
        durationMinutes: data.durationMinutes ?? 60,
        timezone: data.timezone ?? 'Asia/Jakarta',
        attemptLimit: data.attemptLimit ?? 1,
        shuffleQuestions: data.shuffleQuestions ?? false,
        shuffleOptions: data.shuffleOptions ?? false,
        randomSelect: data.randomSelect ?? false,
        poolSource: (data.poolSource ?? 'MANUAL') as never,
        passingScore: data.passingScore ?? 0,
        showResult: data.showResult ?? false,
        showCorrectAnswer: data.showCorrectAnswer ?? false,
        showExplanation: data.showExplanation ?? false,
        allowReview: data.allowReview ?? true,
        allowResume: data.allowResume ?? false,
        autoSubmit: data.autoSubmit ?? true,
        lateSubmission: data.lateSubmission ?? false,
        fullscreenMode: data.fullscreenMode ?? false,
        browserLock: data.browserLock ?? false,
        showScoreByQuestion: data.showScoreByQuestion ?? false,
        createdById: data.createdById ?? null,
      },
      include: assessmentInclude,
    });
    return this.mapDetail(a);
  }

  async update(id: string, tenantId: string, data: Partial<AssessmentCreateDTO>): Promise<AssessmentDTO | null> {
    const existing = await this.prisma.assessment.findFirst({ where: { id, tenantId, deletedAt: null }, select: { id: true } });
    if (!existing) return null;

    const upd = await this.prisma.assessment.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.instructions !== undefined && { instructions: data.instructions }),
        ...(data.status !== undefined && { status: data.status as never }),
        ...(data.visibility !== undefined && { visibility: data.visibility as never }),
        ...(data.courseId !== undefined && { courseId: data.courseId }),
        ...(data.classId !== undefined && { classId: data.classId }),
        ...(data.subjectId !== undefined && { subjectId: data.subjectId }),
        ...(data.openDate !== undefined && { openDate: data.openDate }),
        ...(data.closeDate !== undefined && { closeDate: data.closeDate }),
        ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        ...(data.attemptLimit !== undefined && { attemptLimit: data.attemptLimit }),
        ...(data.shuffleQuestions !== undefined && { shuffleQuestions: data.shuffleQuestions }),
        ...(data.shuffleOptions !== undefined && { shuffleOptions: data.shuffleOptions }),
        ...(data.randomSelect !== undefined && { randomSelect: data.randomSelect }),
        ...(data.poolSource !== undefined && { poolSource: data.poolSource as never }),
        ...(data.passingScore !== undefined && { passingScore: data.passingScore }),
        ...(data.showResult !== undefined && { showResult: data.showResult }),
        ...(data.showCorrectAnswer !== undefined && { showCorrectAnswer: data.showCorrectAnswer }),
        ...(data.showExplanation !== undefined && { showExplanation: data.showExplanation }),
        ...(data.allowReview !== undefined && { allowReview: data.allowReview }),
        ...(data.allowResume !== undefined && { allowResume: data.allowResume }),
        ...(data.autoSubmit !== undefined && { autoSubmit: data.autoSubmit }),
        ...(data.lateSubmission !== undefined && { lateSubmission: data.lateSubmission }),
        ...(data.fullscreenMode !== undefined && { fullscreenMode: data.fullscreenMode }),
        ...(data.browserLock !== undefined && { browserLock: data.browserLock }),
        ...(data.showScoreByQuestion !== undefined && { showScoreByQuestion: data.showScoreByQuestion }),
        version: { increment: 1 },
      },
      include: assessmentInclude,
    });
    return this.mapDetail(upd);
  }

  async softDelete(id: string, tenantId: string, deletedById: string): Promise<boolean> {
    const r = await this.prisma.assessment.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date(), deletedById, version: { increment: 1 } },
    });
    return r.count > 0;
  }

  async setStatus(id: string, tenantId: string, status: string, updatedById: string): Promise<AssessmentDTO | null> {
    const r = await this.prisma.assessment.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { status: status as never, updatedById, version: { increment: 1 } },
    });
    if (r.count === 0) return null;
    return this.findById(id, tenantId);
  }

  async attachQuestions(assessmentId: string, tenantId: string, questionIds: string[], points?: number, pointsMap?: Record<string, number>): Promise<void> {
    const existing = await this.prisma.assessmentQuestionRef.findMany({
      where: { assessmentId, tenantId },
      select: { questionId: true, orderIndex: true },
    });
    const existingMap = new Map(existing.map((e) => [e.questionId, e.orderIndex]));
    const nextOrder = existing.length ? Math.max(...existing.map((e) => e.orderIndex)) + 1 : 0;
    const toCreate: Prisma.AssessmentQuestionRefCreateManyInput[] = [];
    let idx = nextOrder;
    for (const questionId of questionIds) {
      if (existingMap.has(questionId)) continue;
      const perPoints = pointsMap?.[questionId];
      toCreate.push({ tenantId, assessmentId, questionId, orderIndex: idx++, points: perPoints ?? points ?? 1 });
    }
    if (toCreate.length > 0) {
      await this.prisma.assessmentQuestionRef.createMany({ data: toCreate });
      await this.prisma.assessmentQuestion.updateMany({
        where: { id: { in: toCreate.map((c) => c.questionId) } },
        data: { usageCount: { increment: 1 } },
      });
    }
    await this.recomputeMaxPoints(assessmentId, tenantId);
  }

  async removeQuestion(assessmentId: string, questionId: string, tenantId: string): Promise<boolean> {
    const r = await this.prisma.assessmentQuestionRef.deleteMany({ where: { assessmentId, questionId, tenantId } });
    if (r.count > 0) {
      await this.prisma.assessmentQuestion.updateMany({
        where: { id: questionId },
        data: { usageCount: { decrement: 1 } },
      });
      await this.recomputeMaxPoints(assessmentId, tenantId);
    }
    return r.count > 0;
  }

  async updateQuestionPoints(assessmentId: string, questionId: string, tenantId: string, points: number): Promise<boolean> {
    const r = await this.prisma.assessmentQuestionRef.updateMany({
      where: { assessmentId, questionId, tenantId },
      data: { points },
    });
    if (r.count > 0) await this.recomputeMaxPoints(assessmentId, tenantId);
    return r.count > 0;
  }

  async balancePoints(assessmentId: string, tenantId: string, totalPoints: number): Promise<void> {
    const refs = await this.prisma.assessmentQuestionRef.findMany({
      where: { assessmentId, tenantId },
      select: { id: true },
      orderBy: { orderIndex: 'asc' },
    });
    if (refs.length === 0) return;
    const base = Math.floor(totalPoints / refs.length);
    const remainder = totalPoints - base * refs.length;
    for (let i = 0; i < refs.length; i++) {
      await this.prisma.assessmentQuestionRef.update({
        where: { id: refs[i].id },
        data: { points: base + (i < remainder ? 1 : 0) },
      });
    }
    await this.recomputeMaxPoints(assessmentId, tenantId);
  }

  async addPoolRule(assessmentId: string, tenantId: string, data: any): Promise<void> {
    await this.prisma.assessmentPoolRule.create({
      data: {
        tenantId,
        assessmentId,
        poolSource: data.poolSource as never,
        categoryId: data.categoryId ?? null,
        tagId: data.tagId ?? null,
        difficulty: data.difficulty ?? null,
        bloomLevel: data.bloomLevel ?? null,
        learningOutcome: data.learningOutcome ?? null,
        topic: data.topic ?? null,
        count: data.count ?? 1,
        orderIndex: data.orderIndex ?? 0,
        createdById: data.createdById ?? null,
      },
    });
  }

  async removePoolRule(ruleId: string, tenantId: string): Promise<boolean> {
    const r = await this.prisma.assessmentPoolRule.deleteMany({ where: { id: ruleId, tenantId } });
    return r.count > 0;
  }

  async listForStudent(tenantId: string, studentId: string, pagination: PaginationRequest): Promise<PaginatedResult<AssessmentSummary>> {
    // Class-scoped: students only see assessments for the classes they are
    // enrolled in (ACTIVE this semester), plus assessments without a classId (umum).
    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: { tenantId, studentId, status: 'ACTIVE', deletedAt: null },
      select: { classId: true },
    });
    const classIds = enrollments.map((e) => e.classId);

    const where: Prisma.AssessmentWhereInput = {
      tenantId,
      deletedAt: null,
      status: { in: ['READY', 'RUNNING', 'PUBLISHED'] as never[] },
      OR: [
        { classId: null },
        ...(classIds.length > 0 ? [{ classId: { in: classIds } }] : []),
      ],
    };
    const skip = (pagination.page - 1) * pagination.limit;
    const [total, rows] = await Promise.all([
      this.prisma.assessment.count({ where }),
      this.prisma.assessment.findMany({
        where,
        include: {
          _count: { select: { questions: true, attempts: true, results: true } },
        },
        skip,
        take: pagination.limit,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    return {
      data: rows.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        status: a.status,
        classId: a.classId,
        courseId: a.courseId,
        subjectId: a.subjectId,
        openDate: a.openDate,
        closeDate: a.closeDate,
        durationMinutes: a.durationMinutes,
        attemptLimit: a.attemptLimit,
        maxPoints: a.maxPoints,
        questionCount: a._count.questions,
        attemptCount: a._count.attempts,
        submittedCount: a._count.results,
        passingScore: a.passingScore,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
      meta: { total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) },
    };
  }

  async listEnrolledStudents(tenantId: string, classId: string): Promise<Array<{ id: string; fullName: string; nis: string; nisn: string }>> {
    const rows = await this.prisma.studentEnrollment.findMany({
      where: { tenantId, classId, status: 'ACTIVE', deletedAt: null },
      include: { student: { select: { id: true, fullName: true, nis: true, nisn: true } } },
      orderBy: { student: { fullName: 'asc' } },
    });
    return rows.map((r) => ({ id: r.student.id, fullName: r.student.fullName, nis: r.student.nis, nisn: r.student.nisn }));
  }

  async getStudentProfiles(tenantId: string, studentIds: string[]): Promise<Array<{ id: string; fullName: string; nis: string; nisn: string }>> {
    if (studentIds.length === 0) return [];
    const profiles = await this.prisma.studentProfile.findMany({
      where: { id: { in: studentIds }, tenantId },
      select: { id: true, fullName: true, nis: true, nisn: true },
    });
    return profiles.map(p => ({ id: p.id, fullName: p.fullName, nis: p.nis ?? '', nisn: p.nisn ?? '' }));
  }

  private async recomputeMaxPoints(assessmentId: string, tenantId: string): Promise<void> {
    const agg = await this.prisma.assessmentQuestionRef.aggregate({
      where: { assessmentId, tenantId },
      _sum: { points: true },
    });
    await this.prisma.assessment.updateMany({
      where: { id: assessmentId, tenantId },
      data: { maxPoints: agg._sum.points ?? 0 },
    });
  }

  private mapDetail(a: any): AssessmentDTO {
    const qs = (a.questions ?? []).map((ref: any) => {
      const q = ref.question;
      return {
        id: ref.id,
        orderIndex: ref.orderIndex,
        points: ref.points,
        question: {
          id: q.id,
          version: q.version,
          type: q.type,
          difficulty: q.difficulty,
          bloomLevel: q.bloomLevel,
          status: q.status,
          prompt: q.prompt,
          explanation: q.explanation,
          hint: q.hint,
          categoryId: q.categoryId,
          categoryName: q.category?.name ?? null,
          subjectId: q.subjectId,
          classId: q.classId,
          semester: q.semester,
          curriculum: q.curriculum,
          competency: q.competency,
          learningOutcome: q.learningOutcome,
          topic: q.topic,
          phase: q.phase,
          points: q.points,
          negativeMarking: q.negativeMarking,
          estimatedTime: q.estimatedTime,
          randomWeight: q.randomWeight,
          options: q.options ?? null,
          answer: q.answer ?? null,
          caseData: q.caseData ?? null,
          usageCount: q.usageCount,
          tags: (q.tags ?? []).map((t: any) => ({ id: t.tag.id, name: t.tag.name, slug: t.tag.slug, color: t.tag.color, questionCount: 0 })),
          versionNumber: q.activeVersion?.versionNumber ?? q.version,
          createdAt: q.createdAt,
          updatedAt: q.updatedAt,
        },
      };
    });
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      instructions: a.instructions,
      status: a.status,
      visibility: a.visibility,
      classId: a.classId,
      courseId: a.courseId,
      subjectId: a.subjectId,
      teacherId: a.teacherId,
      openDate: a.openDate,
      closeDate: a.closeDate,
      durationMinutes: a.durationMinutes,
      timezone: a.timezone,
      attemptLimit: a.attemptLimit,
      shuffleQuestions: a.shuffleQuestions,
      shuffleOptions: a.shuffleOptions,
      randomSelect: a.randomSelect,
      poolSource: a.poolSource,
      passingScore: a.passingScore,
      showResult: a.showResult,
      showCorrectAnswer: a.showCorrectAnswer,
      showExplanation: a.showExplanation,
      allowReview: a.allowReview,
      allowResume: a.allowResume,
      autoSubmit: a.autoSubmit,
      lateSubmission: a.lateSubmission,
      fullscreenMode: a.fullscreenMode,
      browserLock: a.browserLock,
      showScoreByQuestion: a.showScoreByQuestion,
      maxPoints: a.maxPoints,
      questionCount: qs.length,
      attemptCount: a._count?.attempts ?? 0,
      submittedCount: a._count?.results ?? 0,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      questions: qs,
      poolRules: (a.poolRules ?? []).map((r: any) => ({
        id: r.id,
        poolSource: r.poolSource,
        categoryId: r.categoryId,
        tagId: r.tagId,
        difficulty: r.difficulty,
        bloomLevel: r.bloomLevel,
        learningOutcome: r.learningOutcome,
        topic: r.topic,
        count: r.count,
      })),
    };
  }
}
