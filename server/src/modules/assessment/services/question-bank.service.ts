import { IQuestionBankRepository, QuestionBankFilters } from '../repositories/question-bank.repository';
import { AuditLogger } from './audit.logger';
import type { PaginationRequest, SortRequest, QuestionDTO } from '../dtos/assessment.dto';
import { BusinessRuleException, ConflictException, ResourceNotFoundException } from '../../../core/exceptions/app.exception';

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 110) || 'item';

export class QuestionBankService {
  constructor(
    private readonly repo: IQuestionBankRepository,
    private readonly audit: AuditLogger,
  ) {}

  // ------------------------------------------------------------- CATEGORIES

  async listCategories(tenantId: string, parentId?: string | null, search?: string) {
    return this.repo.listCategories(tenantId, parentId, search);
  }

  async createCategory(tenantId: string, actorId: string, data: { name: string; parentId?: string | null; description?: string | null; orderIndex?: number }) {
    if (data.parentId && !(await this.repo.categoryExists(data.parentId, tenantId))) {
      throw new BusinessRuleException('Parent kategori tidak ditemukan');
    }
    const category = await this.repo.createCategory({
      tenantId,
      name: data.name,
      slug: slugify(data.name),
      parentId: data.parentId,
      description: data.description,
      orderIndex: data.orderIndex,
      createdById: actorId,
    });
    await this.audit.log({ tenantId, actorId, resource: 'question_category', resourceId: category.id, action: 'CREATE' });
    return category;
  }

  async updateCategory(tenantId: string, actorId: string, id: string, data: any) {
    const category = await this.repo.updateCategory(id, tenantId, {
      name: data.name,
      slug: data.name ? slugify(data.name) : undefined,
      parentId: data.parentId,
      description: data.description,
      orderIndex: data.orderIndex,
      updatedById: actorId,
    });
    if (!category) throw new ResourceNotFoundException('QuestionCategory', id);
    await this.audit.log({ tenantId, actorId, resource: 'question_category', resourceId: id, action: 'UPDATE' });
    return category;
  }

  async deleteCategory(tenantId: string, actorId: string, id: string) {
    const ok = await this.repo.softDeleteCategory(id, tenantId, actorId);
    if (!ok) throw new ResourceNotFoundException('QuestionCategory', id);
    await this.audit.log({ tenantId, actorId, resource: 'question_category', resourceId: id, action: 'DELETE' });
  }

  // ------------------------------------------------------------- TAGS

  async listTags(tenantId: string, search?: string) {
    return this.repo.listTags(tenantId, search);
  }

  async createTag(tenantId: string, actorId: string, data: { name: string; color?: string | null }) {
    const tag = await this.repo.createTag({ tenantId, name: data.name, slug: slugify(data.name), color: data.color, createdById: actorId });
    await this.audit.log({ tenantId, actorId, resource: 'question_tag', resourceId: tag.id, action: 'CREATE' });
    return tag;
  }

  async deleteTag(tenantId: string, actorId: string, id: string) {
    const ok = await this.repo.softDeleteTag(id, tenantId, actorId);
    if (!ok) throw new ResourceNotFoundException('QuestionTag', id);
    await this.audit.log({ tenantId, actorId, resource: 'question_tag', resourceId: id, action: 'DELETE' });
  }

  // ------------------------------------------------------------- QUESTIONS

  async listQuestions(tenantId: string, filter: Omit<QuestionBankFilters, 'tenantId'>, pagination: PaginationRequest, sort: SortRequest) {
    return this.repo.listQuestions({ tenantId, ...filter }, pagination, sort);
  }

  async getQuestion(tenantId: string, id: string): Promise<QuestionDTO> {
    const q = await this.repo.findQuestionById(id, tenantId);
    if (!q) throw new ResourceNotFoundException('AssessmentQuestion', id);
    return q;
  }

  async createQuestion(tenantId: string, actorId: string, data: any): Promise<QuestionDTO> {
    const q = await this.repo.createQuestion({
      tenantId,
      categoryId: data.categoryId,
      subjectId: data.subjectId,
      classId: data.classId,
      semester: data.semester,
      curriculum: data.curriculum,
      competency: data.competency,
      learningOutcome: data.learningOutcome,
      topic: data.topic,
      phase: data.phase,
      type: data.type,
      difficulty: data.difficulty,
      bloomLevel: data.bloomLevel,
      status: data.status,
      prompt: data.prompt,
      explanation: data.explanation,
      hint: data.hint,
      points: data.points,
      negativeMarking: data.negativeMarking,
      estimatedTime: data.estimatedTime,
      randomWeight: data.randomWeight,
      options: data.options,
      answer: data.answer,
      caseData: data.caseData,
      tagIds: data.tagIds,
      createdById: actorId,
    });
    await this.audit.log({ tenantId, actorId, resource: 'assessment_question', resourceId: q.id, action: 'CREATE' });
    return q;
  }

  async updateQuestion(tenantId: string, actorId: string, id: string, data: any): Promise<QuestionDTO> {
    const q = await this.repo.updateQuestion({ tenantId, questionId: id, ...data, updatedById: actorId });
    if (!q) throw new ResourceNotFoundException('AssessmentQuestion', id);
    await this.audit.log({ tenantId, actorId, resource: 'assessment_question', resourceId: id, action: 'UPDATE' });
    return q;
  }

  async deleteQuestion(tenantId: string, actorId: string, id: string) {
    const ok = await this.repo.softDeleteQuestion(id, tenantId, actorId);
    if (!ok) throw new ResourceNotFoundException('AssessmentQuestion', id);
    await this.audit.log({ tenantId, actorId, resource: 'assessment_question', resourceId: id, action: 'DELETE' });
  }

  async duplicateQuestion(tenantId: string, actorId: string, id: string): Promise<QuestionDTO> {
    const q = await this.repo.duplicateQuestion(id, tenantId, actorId);
    if (!q) throw new ResourceNotFoundException('AssessmentQuestion', id);
    await this.audit.log({ tenantId, actorId, resource: 'assessment_question', resourceId: q.id, action: 'DUPLICATE', oldValues: { sourceId: id } });
    return q;
  }

  async setStatus(tenantId: string, actorId: string, id: string, status: string): Promise<QuestionDTO> {
    const q = await this.repo.setStatus(id, tenantId, status, actorId);
    if (!q) throw new ResourceNotFoundException('AssessmentQuestion', id);
    await this.audit.log({ tenantId, actorId, resource: 'assessment_question', resourceId: id, action: `STATUS_${status}` });
    return q;
  }

  async listVersions(tenantId: string, id: string) {
    const q = await this.repo.findQuestionById(id, tenantId);
    if (!q) throw new ResourceNotFoundException('AssessmentQuestion', id);
    return this.repo.listVersions(id, tenantId);
  }

  async restoreVersion(tenantId: string, actorId: string, questionId: string, versionNumber: number): Promise<QuestionDTO> {
    const versions = await this.repo.listVersions(questionId, tenantId);
    const target = versions.find((v) => v.versionNumber === versionNumber);
    if (!target) throw new ResourceNotFoundException('QuestionVersion', String(versionNumber));
    const snapshot = target.snapshot as any;
    const q = await this.repo.updateQuestion({
      tenantId,
      questionId,
      type: snapshot.type,
      difficulty: snapshot.difficulty,
      bloomLevel: snapshot.bloomLevel,
      status: snapshot.status,
      prompt: snapshot.prompt,
      explanation: snapshot.explanation,
      hint: snapshot.hint,
      points: snapshot.points,
      negativeMarking: snapshot.negativeMarking,
      estimatedTime: snapshot.estimatedTime,
      randomWeight: snapshot.randomWeight,
      options: snapshot.options,
      answer: snapshot.answer,
      caseData: snapshot.caseData,
      categoryId: snapshot.categoryId,
      topic: snapshot.topic,
      learningOutcome: snapshot.learningOutcome,
      updatedById: actorId,
    });
    if (!q) throw new ResourceNotFoundException('AssessmentQuestion', questionId);
    await this.audit.log({ tenantId, actorId, resource: 'assessment_question', resourceId: questionId, action: 'RESTORE_VERSION', newValues: { versionNumber } });
    return q;
  }

  // ------------------------------------------------------------- IMPORT / EXPORT (JSON/CSV)

  async importQuestions(tenantId: string, actorId: string, rows: any[]): Promise<{ imported: number }> {
    let imported = 0;
    for (const row of rows) {
      if (!row?.prompt || !row?.type) continue;
      await this.repo.createQuestion({
        tenantId,
        type: row.type,
        difficulty: row.difficulty ?? 'MEDIUM',
        bloomLevel: row.bloomLevel ?? 'C2_UNDERSTANDING',
        prompt: row.prompt,
        explanation: row.explanation ?? null,
        hint: row.hint ?? null,
        options: row.options ?? null,
        answer: row.answer ?? null,
        caseData: row.caseData ?? null,
        points: row.points ?? 1,
        negativeMarking: row.negativeMarking ?? 0,
        estimatedTime: row.estimatedTime ?? 60,
        topic: row.topic ?? null,
        createdById: actorId,
      });
      imported++;
    }
    await this.audit.log({ tenantId, actorId, resource: 'assessment_question', action: 'IMPORT', newValues: { imported } });
    return { imported };
  }

  async exportQuestions(tenantId: string, filter: Omit<QuestionBankFilters, 'tenantId'>): Promise<QuestionDTO[]> {
    const page = await this.repo.listQuestions({ tenantId, ...filter }, { page: 1, limit: 1000 }, { sortBy: 'updatedAt', sortDir: 'desc' });
    return page.data;
  }

  async assertSlugAvailable(tenantId: string, _name: string): Promise<void> {
    void tenantId;
    // Slug uniqueness handled by unique constraint; conflict throws Prisma P2002.
  }
}
