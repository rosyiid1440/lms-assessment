import { PrismaClient, Prisma } from '@prisma/client';
import type {
  PaginationRequest,
  SortRequest,
  PaginatedResult,
  QuestionCategorySummary,
  QuestionTagSummary,
  QuestionDTO,
  QuestionVersionDTO,
  QuestionCreateDTO,
  QuestionUpdateDTO,
} from '../dtos/assessment.dto';

export interface QuestionBankFilters {
  tenantId: string;
  search?: string;
  type?: string;
  difficulty?: string;
  bloomLevel?: string;
  status?: string;
  categoryId?: string;
  tagId?: string;
  topic?: string;
  learningOutcome?: string;
  subjectId?: string;
  createdById?: string;
}

export interface IQuestionBankRepository {
  listCategories(tenantId: string, parentId?: string | null, search?: string): Promise<QuestionCategorySummary[]>;
  createCategory(data: { tenantId: string; name: string; slug: string; parentId?: string | null; description?: string | null; orderIndex?: number; createdById?: string | null }): Promise<QuestionCategorySummary>;
  updateCategory(id: string, tenantId: string, data: Partial<{ name: string; slug: string; parentId: string | null; description: string | null; orderIndex: number; updatedById: string | null }>): Promise<QuestionCategorySummary | null>;
  softDeleteCategory(id: string, tenantId: string, deletedById: string): Promise<boolean>;
  categoryExists(id: string, tenantId: string): Promise<boolean>;

  listTags(tenantId: string, search?: string): Promise<QuestionTagSummary[]>;
  createTag(data: { tenantId: string; name: string; slug: string; color?: string | null; createdById?: string | null }): Promise<QuestionTagSummary>;
  softDeleteTag(id: string, tenantId: string, deletedById: string): Promise<boolean>;

  listQuestions(filter: QuestionBankFilters, pagination: PaginationRequest, sort: SortRequest): Promise<PaginatedResult<QuestionDTO>>;
  findQuestionById(id: string, tenantId: string): Promise<QuestionDTO | null>;
  createQuestion(data: QuestionCreateDTO): Promise<QuestionDTO>;
  updateQuestion(data: QuestionUpdateDTO): Promise<QuestionDTO | null>;
  softDeleteQuestion(id: string, tenantId: string, deletedById: string): Promise<boolean>;
  duplicateQuestion(id: string, tenantId: string, createdById: string): Promise<QuestionDTO | null>;
  listVersions(questionId: string, tenantId: string): Promise<QuestionVersionDTO[]>;
  setStatus(id: string, tenantId: string, status: string, updatedById: string): Promise<QuestionDTO | null>;
  countByCategory(tenantId: string, categoryIds: string[]): Promise<{ categoryId: string; count: number }[]>;
  countByTag(tenantId: string, tagIds: string[]): Promise<{ tagId: string; count: number }[]>;
}

const questionInclude = {
  category: { select: { id: true, name: true } },
  tags: { select: { tag: { select: { id: true, name: true, slug: true, color: true } } } },
  activeVersion: { select: { id: true, versionNumber: true } },
} satisfies Prisma.AssessmentQuestionInclude;

export class PrismaQuestionBankRepository implements IQuestionBankRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ------------------------------------------------------------------ CATEGORIES

  async listCategories(tenantId: string, parentId?: string | null, search?: string): Promise<QuestionCategorySummary[]> {
    const where: Prisma.QuestionCategoryWhereInput = {
      tenantId,
      deletedAt: null,
      ...(parentId !== undefined ? { parentId: parentId ?? null } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };
    const cats = await this.prisma.questionCategory.findMany({ where, orderBy: { orderIndex: 'asc' }, take: 500 });
    const counts = await this.countByCategory(tenantId, cats.map((c) => c.id));
    const countMap = new Map(counts.map((c) => [c.categoryId, c.count]));
    return cats.map((c) => ({
      id: c.id,
      parentId: c.parentId,
      name: c.name,
      slug: c.slug,
      description: c.description,
      orderIndex: c.orderIndex,
      questionCount: countMap.get(c.id) ?? 0,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  async createCategory(data: { tenantId: string; name: string; slug: string; parentId?: string | null; description?: string | null; orderIndex?: number; createdById?: string | null }): Promise<QuestionCategorySummary> {
    const c = await this.prisma.questionCategory.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        slug: data.slug,
        parentId: data.parentId ?? null,
        description: data.description ?? null,
        orderIndex: data.orderIndex ?? 0,
        createdById: data.createdById ?? null,
      },
    });
    return { ...this.toCategorySummary(c), questionCount: 0 };
  }

  async updateCategory(id: string, tenantId: string, data: Partial<{ name: string; slug: string; parentId: string | null; description: string | null; orderIndex: number; updatedById: string | null }>): Promise<QuestionCategorySummary | null> {
    const c = await this.prisma.questionCategory.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { ...data, version: { increment: 1 } },
    });
    if (c.count === 0) return null;
    const updated = await this.prisma.questionCategory.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!updated) return null;
    const counts = await this.countByCategory(tenantId, [updated.id]);
    return { ...this.toCategorySummary(updated), questionCount: counts[0]?.count ?? 0 };
  }

  async softDeleteCategory(id: string, tenantId: string, deletedById: string): Promise<boolean> {
    const r = await this.prisma.questionCategory.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date(), deletedById, version: { increment: 1 } },
    });
    return r.count > 0;
  }

  async categoryExists(id: string, tenantId: string): Promise<boolean> {
    return (await this.prisma.questionCategory.count({ where: { id, tenantId, deletedAt: null } })) > 0;
  }

  async countByCategory(tenantId: string, categoryIds: string[]): Promise<{ categoryId: string; count: number }[]> {
    if (categoryIds.length === 0) return [];
    const rows = await this.prisma.assessmentQuestion.groupBy({
      by: ['categoryId'],
      where: { tenantId, categoryId: { in: categoryIds }, deletedAt: null },
      _count: { _all: true },
    });
    return rows.map((r) => ({ categoryId: r.categoryId as string, count: r._count._all }));
  }

  // ------------------------------------------------------------------ TAGS

  async listTags(tenantId: string, search?: string): Promise<QuestionTagSummary[]> {
    const where: Prisma.QuestionTagWhereInput = {
      tenantId,
      deletedAt: null,
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };
    const tags = await this.prisma.questionTag.findMany({ where, orderBy: { name: 'asc' }, take: 300 });
    const counts = await this.countByTag(tenantId, tags.map((t) => t.id));
    const countMap = new Map(counts.map((c) => [c.tagId, c.count]));
    return tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug, color: t.color, questionCount: countMap.get(t.id) ?? 0 }));
  }

  async createTag(data: { tenantId: string; name: string; slug: string; color?: string | null; createdById?: string | null }): Promise<QuestionTagSummary> {
    const t = await this.prisma.questionTag.create({
      data: { tenantId: data.tenantId, name: data.name, slug: data.slug, color: data.color ?? null, createdById: data.createdById ?? null },
    });
    return { id: t.id, name: t.name, slug: t.slug, color: t.color, questionCount: 0 };
  }

  async softDeleteTag(id: string, tenantId: string, deletedById: string): Promise<boolean> {
    const r = await this.prisma.questionTag.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date(), deletedById },
    });
    return r.count > 0;
  }

  async countByTag(tenantId: string, tagIds: string[]): Promise<{ tagId: string; count: number }[]> {
    if (tagIds.length === 0) return [];
    const rows = await this.prisma.assessmentQuestionTag.groupBy({
      by: ['tagId'],
      where: { tenantId, tagId: { in: tagIds } },
      _count: { _all: true },
    });
    return rows.map((r) => ({ tagId: r.tagId, count: r._count._all }));
  }

  // ------------------------------------------------------------------ QUESTIONS

  async listQuestions(filter: QuestionBankFilters, pagination: PaginationRequest, sort: SortRequest): Promise<PaginatedResult<QuestionDTO>> {
    const where: Prisma.AssessmentQuestionWhereInput = {
      tenantId: filter.tenantId,
      deletedAt: null,
    };
    if (filter.search) where.prompt = { contains: filter.search, mode: 'insensitive' };
    if (filter.type) where.type = filter.type as never;
    if (filter.difficulty) where.difficulty = filter.difficulty as never;
    if (filter.bloomLevel) where.bloomLevel = filter.bloomLevel as never;
    if (filter.status) where.status = filter.status as never;
    if (filter.categoryId) where.categoryId = filter.categoryId;
    if (filter.topic) where.topic = filter.topic;
    if (filter.learningOutcome) where.learningOutcome = filter.learningOutcome;
    if (filter.subjectId) where.subjectId = filter.subjectId;
    if (filter.tagId) where.tags = { some: { tagId: filter.tagId } };
    if (filter.createdById) where.createdById = filter.createdById;

    const sortable = ['updatedAt', 'createdAt', 'prompt', 'difficulty', 'type', 'status'].includes(sort.sortBy) ? sort.sortBy : 'updatedAt';
    const skip = (pagination.page - 1) * pagination.limit;

    const [total, questions] = await Promise.all([
      this.prisma.assessmentQuestion.count({ where }),
      this.prisma.assessmentQuestion.findMany({
        where,
        include: questionInclude,
        skip,
        take: pagination.limit,
        orderBy: { [sortable]: sort.sortDir },
      }),
    ]);

    return {
      data: questions.map((q) => this.mapQuestion(q)),
      meta: { total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) },
    };
  }

  async findQuestionById(id: string, tenantId: string): Promise<QuestionDTO | null> {
    const q = await this.prisma.assessmentQuestion.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: questionInclude,
    });
    return q ? this.mapQuestion(q) : null;
  }

  async createQuestion(data: QuestionCreateDTO): Promise<QuestionDTO> {
    const q = await this.prisma.assessmentQuestion.create({
      data: {
        tenantId: data.tenantId,
        categoryId: data.categoryId ?? null,
        subjectId: data.subjectId ?? null,
        classId: data.classId ?? null,
        semester: data.semester ?? null,
        curriculum: data.curriculum ?? null,
        competency: data.competency ?? null,
        learningOutcome: data.learningOutcome ?? null,
        topic: data.topic ?? null,
        phase: data.phase ?? null,
        type: data.type as never,
        difficulty: data.difficulty as never,
        bloomLevel: data.bloomLevel as never,
        status: (data.status ?? 'DRAFT') as never,
        prompt: data.prompt,
        explanation: data.explanation ?? null,
        hint: data.hint ?? null,
        points: data.points ?? 1,
        negativeMarking: data.negativeMarking ?? 0,
        estimatedTime: data.estimatedTime ?? 60,
        randomWeight: data.randomWeight ?? false,
        options: (data.options as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
        answer: (data.answer as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
        caseData: (data.caseData as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
        createdById: data.createdById ?? null,
        tags: data.tagIds?.length
          ? { create: data.tagIds.map((tagId) => ({ tenantId: data.tenantId, tagId })) }
          : undefined,
      },
      include: questionInclude,
    });
    await this.createVersion(q);
    return this.mapQuestion(q);
  }

  async updateQuestion(data: QuestionUpdateDTO): Promise<QuestionDTO | null> {
    const existing = await this.prisma.assessmentQuestion.findFirst({
      where: { id: data.questionId, tenantId: data.tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return null;

    const tagOps = data.tagIds
      ? {
          deleteMany: { questionId: data.questionId },
          create: data.tagIds.map((tagId) => ({ tenantId: data.tenantId, tagId })),
        }
      : undefined;

    const q = await this.prisma.assessmentQuestion.update({
      where: { id: data.questionId },
      data: {
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.subjectId !== undefined && { subjectId: data.subjectId }),
        ...(data.classId !== undefined && { classId: data.classId }),
        ...(data.semester !== undefined && { semester: data.semester }),
        ...(data.curriculum !== undefined && { curriculum: data.curriculum }),
        ...(data.competency !== undefined && { competency: data.competency }),
        ...(data.learningOutcome !== undefined && { learningOutcome: data.learningOutcome }),
        ...(data.topic !== undefined && { topic: data.topic }),
        ...(data.phase !== undefined && { phase: data.phase }),
        ...(data.type !== undefined && { type: data.type as never }),
        ...(data.difficulty !== undefined && { difficulty: data.difficulty as never }),
        ...(data.bloomLevel !== undefined && { bloomLevel: data.bloomLevel as never }),
        ...(data.status !== undefined && { status: data.status as never }),
        ...(data.prompt !== undefined && { prompt: data.prompt }),
        ...(data.explanation !== undefined && { explanation: data.explanation }),
        ...(data.hint !== undefined && { hint: data.hint }),
        ...(data.points !== undefined && { points: data.points }),
        ...(data.negativeMarking !== undefined && { negativeMarking: data.negativeMarking }),
        ...(data.estimatedTime !== undefined && { estimatedTime: data.estimatedTime }),
        ...(data.randomWeight !== undefined && { randomWeight: data.randomWeight }),
        ...(data.options !== undefined && { options: (data.options as Prisma.InputJsonValue | null) ?? Prisma.JsonNull }),
        ...(data.answer !== undefined && { answer: (data.answer as Prisma.InputJsonValue | null) ?? Prisma.JsonNull }),
        ...(data.caseData !== undefined && { caseData: (data.caseData as Prisma.InputJsonValue | null) ?? Prisma.JsonNull }),
        ...(data.updatedById !== undefined && { updatedById: data.updatedById }),
        version: { increment: 1 },
        ...(tagOps ? { tags: tagOps } : {}),
      },
      include: questionInclude,
    });
    await this.createVersion(q);
    return this.mapQuestion(q);
  }

  async softDeleteQuestion(id: string, tenantId: string, deletedById: string): Promise<boolean> {
    const r = await this.prisma.assessmentQuestion.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date(), deletedById, version: { increment: 1 } },
    });
    return r.count > 0;
  }

  async duplicateQuestion(id: string, tenantId: string, createdById: string): Promise<QuestionDTO | null> {
    const src = await this.prisma.assessmentQuestion.findFirst({ where: { id, tenantId, deletedAt: null }, include: { tags: true } });
    if (!src) return null;
    const copy = await this.prisma.assessmentQuestion.create({
      data: {
        tenantId,
        categoryId: src.categoryId,
        subjectId: src.subjectId,
        classId: src.classId,
        semester: src.semester,
        curriculum: src.curriculum,
        competency: src.competency,
        learningOutcome: src.learningOutcome,
        topic: src.topic,
        phase: src.phase,
        type: src.type,
        difficulty: src.difficulty,
        bloomLevel: src.bloomLevel,
        status: 'DRAFT',
        prompt: src.prompt,
        explanation: src.explanation,
        hint: src.hint,
        points: src.points,
        negativeMarking: src.negativeMarking,
        estimatedTime: src.estimatedTime,
        randomWeight: src.randomWeight,
        options: src.options ?? Prisma.JsonNull,
        answer: src.answer ?? Prisma.JsonNull,
        caseData: src.caseData ?? Prisma.JsonNull,
        duplicateOfId: src.id,
        createdById,
        tags: src.tags.length ? { create: src.tags.map((t) => ({ tenantId, tagId: t.tagId })) } : undefined,
      },
      include: questionInclude,
    });
    await this.createVersion(copy);
    return this.mapQuestion(copy);
  }

  async listVersions(questionId: string, tenantId: string): Promise<QuestionVersionDTO[]> {
    const versions = await this.prisma.assessmentQuestionVersion.findMany({
      where: { questionId, tenantId, deletedAt: null },
      orderBy: { versionNumber: 'desc' },
      take: 200,
    });
    return versions.map((v) => ({ id: v.id, versionNumber: v.versionNumber, snapshot: v.snapshot, createdAt: v.createdAt, createdById: v.createdById }));
  }

  async setStatus(id: string, tenantId: string, status: string, updatedById: string): Promise<QuestionDTO | null> {
    const r = await this.prisma.assessmentQuestion.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { status: status as never, updatedById, version: { increment: 1 } },
    });
    if (r.count === 0) return null;
    return this.findQuestionById(id, tenantId);
  }

  // ------------------------------------------------------------------ HELPERS

  private async createVersion(q: any): Promise<void> {
    const count = await this.prisma.assessmentQuestionVersion.count({ where: { questionId: q.id } });
    const snapshot = {
      prompt: q.prompt,
      explanation: q.explanation,
      hint: q.hint,
      type: q.type,
      difficulty: q.difficulty,
      bloomLevel: q.bloomLevel,
      points: q.points,
      negativeMarking: q.negativeMarking,
      estimatedTime: q.estimatedTime,
      randomWeight: q.randomWeight,
      options: q.options,
      answer: q.answer,
      caseData: q.caseData,
      categoryId: q.categoryId,
      topic: q.topic,
      learningOutcome: q.learningOutcome,
      status: q.status,
    };
    const version = await this.prisma.assessmentQuestionVersion.create({
      data: { tenantId: q.tenantId, questionId: q.id, versionNumber: count + 1, snapshot, createdById: q.createdById },
    });
    await this.prisma.assessmentQuestion.update({
      where: { id: q.id },
      data: { currentVersionId: version.id },
    });
  }

  private mapQuestion(q: any): QuestionDTO {
    return {
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
    };
  }

  private toCategorySummary(c: any): Omit<QuestionCategorySummary, 'questionCount'> {
    return {
      id: c.id,
      parentId: c.parentId,
      name: c.name,
      slug: c.slug,
      description: c.description,
      orderIndex: c.orderIndex,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }
}
