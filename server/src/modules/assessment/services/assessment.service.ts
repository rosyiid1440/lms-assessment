import { IAssessmentRepository, AssessmentFilters } from '../repositories/assessment.repository';
import { IQuestionBankRepository } from '../repositories/question-bank.repository';
import { AuditLogger } from './audit.logger';
import type { PaginationRequest, SortRequest, AssessmentDTO } from '../dtos/assessment.dto';
import { BusinessRuleException, ResourceNotFoundException } from '../../../core/exceptions/app.exception';

export class AssessmentService {
  constructor(
    private readonly repo: IAssessmentRepository,
    private readonly questionRepo: IQuestionBankRepository,
    private readonly audit: AuditLogger,
  ) {}

  async list(tenantId: string, filter: Omit<AssessmentFilters, 'tenantId'>, pagination: PaginationRequest, sort: SortRequest) {
    return this.repo.list({ tenantId, ...filter }, pagination, sort);
  }

  async get(tenantId: string, id: string): Promise<AssessmentDTO> {
    const a = await this.repo.findById(id, tenantId);
    if (!a) throw new ResourceNotFoundException('Assessment', id);
    return a;
  }

  async create(tenantId: string, actorId: string, data: any): Promise<AssessmentDTO> {
    const a = await this.repo.create({ tenantId, ...data, teacherId: data.teacherId ?? actorId, createdById: actorId });
    await this.audit.log({ tenantId, actorId, resource: 'assessment', resourceId: a.id, action: 'CREATE' });
    return a;
  }

  async update(tenantId: string, actorId: string, id: string, data: any): Promise<AssessmentDTO> {
    const a = await this.repo.update(id, tenantId, data);
    if (!a) throw new ResourceNotFoundException('Assessment', id);
    await this.audit.log({ tenantId, actorId, resource: 'assessment', resourceId: id, action: 'UPDATE' });
    return a;
  }

  async delete(tenantId: string, actorId: string, id: string) {
    const ok = await this.repo.softDelete(id, tenantId, actorId);
    if (!ok) throw new ResourceNotFoundException('Assessment', id);
    await this.audit.log({ tenantId, actorId, resource: 'assessment', resourceId: id, action: 'DELETE' });
  }

  async setStatus(tenantId: string, actorId: string, id: string, status: string): Promise<AssessmentDTO> {
    if (status === 'PUBLISHED') {
      const detail = await this.repo.findById(id, tenantId);
      if (!detail) throw new ResourceNotFoundException('Assessment', id);
      if (detail.questionCount === 0) throw new BusinessRuleException('Tidak dapat publish assessment tanpa soal');
      if (detail.durationMinutes <= 0) throw new BusinessRuleException('Durasi assessment harus > 0');
    }
    const a = await this.repo.setStatus(id, tenantId, status, actorId);
    if (!a) throw new ResourceNotFoundException('Assessment', id);
    await this.audit.log({ tenantId, actorId, resource: 'assessment', resourceId: id, action: `STATUS_${status}` });
    return a;
  }

  async attachQuestions(tenantId: string, actorId: string, id: string, questionIds: string[], points?: number, pointsMap?: Record<string, number>): Promise<AssessmentDTO> {
    const a = await this.repo.findById(id, tenantId);
    if (!a) throw new ResourceNotFoundException('Assessment', id);
    if (a.status === 'RUNNING' || a.status === 'FINISHED') {
      throw new BusinessRuleException('Tidak dapat mengubah soal karena ujian sedang atau sudah berlangsung');
    }
    const valid = await this.questionRepo.listQuestions(
      { tenantId, status: 'PUBLISHED', createdById: actorId },
      { page: 1, limit: 1000 },
      { sortBy: 'updatedAt', sortDir: 'desc' },
    );
    const validIds = new Set(valid.data.map((q) => q.id));
    for (const qid of questionIds) {
      if (!validIds.has(qid)) throw new BusinessRuleException(`Soal ${qid} tidak ditemukan atau belum dipublikasikan`);
    }
    await this.repo.attachQuestions(id, tenantId, questionIds, points, pointsMap);
    await this.audit.log({ tenantId, actorId, resource: 'assessment', resourceId: id, action: 'ATTACH_QUESTIONS', newValues: { questionIds } });
    return this.repo.findById(id, tenantId) as Promise<AssessmentDTO>;
  }

  async setQuestionPoints(tenantId: string, actorId: string, id: string, questionId: string, points: number): Promise<AssessmentDTO> {
    const a = await this.repo.findById(id, tenantId);
    if (!a) throw new ResourceNotFoundException('Assessment', id);
    if (a.status === 'RUNNING' || a.status === 'FINISHED') {
      throw new BusinessRuleException('Tidak dapat mengubah bobot karena ujian sedang atau sudah berlangsung');
    }
    const ok = await this.repo.updateQuestionPoints(id, questionId, tenantId, points);
    if (!ok) throw new ResourceNotFoundException('QuestionRef', questionId);
    await this.audit.log({ tenantId, actorId, resource: 'assessment', resourceId: id, action: 'SET_QUESTION_POINTS', newValues: { questionId, points } });
    return this.repo.findById(id, tenantId) as Promise<AssessmentDTO>;
  }

  async balanceQuestionPoints(tenantId: string, actorId: string, id: string, totalPoints: number): Promise<AssessmentDTO> {
    const a = await this.repo.findById(id, tenantId);
    if (!a) throw new ResourceNotFoundException('Assessment', id);
    if (a.status === 'RUNNING' || a.status === 'FINISHED') {
      throw new BusinessRuleException('Tidak dapat mengubah bobot karena ujian sedang atau sudah berlangsung');
    }
    if (!a.questions.length) throw new BusinessRuleException('Belum ada soal untuk dibagi bobotnya');
    await this.repo.balancePoints(id, tenantId, totalPoints);
    await this.audit.log({ tenantId, actorId, resource: 'assessment', resourceId: id, action: 'BALANCE_POINTS', newValues: { totalPoints } });
    return this.repo.findById(id, tenantId) as Promise<AssessmentDTO>;
  }

  async removeQuestion(tenantId: string, actorId: string, id: string, questionId: string): Promise<AssessmentDTO> {
    const a = await this.repo.findById(id, tenantId);
    if (!a) throw new ResourceNotFoundException('Assessment', id);
    if (a.status === 'RUNNING' || a.status === 'FINISHED') {
      throw new BusinessRuleException('Tidak dapat mengubah soal karena ujian sedang atau sudah berlangsung');
    }
    await this.repo.removeQuestion(id, questionId, tenantId);
    await this.audit.log({ tenantId, actorId, resource: 'assessment', resourceId: id, action: 'REMOVE_QUESTION', newValues: { questionId } });
    return this.repo.findById(id, tenantId) as Promise<AssessmentDTO>;
  }

  async addPoolRule(tenantId: string, actorId: string, id: string, data: any): Promise<AssessmentDTO> {
    const a = await this.repo.findById(id, tenantId);
    if (!a) throw new ResourceNotFoundException('Assessment', id);
    if (a.status === 'RUNNING' || a.status === 'FINISHED') {
      throw new BusinessRuleException('Tidak dapat mengubah pool soal karena ujian sedang atau sudah berlangsung');
    }
    await this.repo.addPoolRule(id, tenantId, { ...data, createdById: actorId });
    await this.audit.log({ tenantId, actorId, resource: 'assessment', resourceId: id, action: 'ADD_POOL_RULE' });
    return this.repo.findById(id, tenantId) as Promise<AssessmentDTO>;
  }

  async removePoolRule(tenantId: string, actorId: string, id: string, ruleId: string): Promise<AssessmentDTO> {
    const a = await this.repo.findById(id, tenantId);
    if (!a) throw new ResourceNotFoundException('Assessment', id);
    if (a.status === 'RUNNING' || a.status === 'FINISHED') {
      throw new BusinessRuleException('Tidak dapat mengubah pool soal karena ujian sedang atau sudah berlangsung');
    }
    await this.repo.removePoolRule(ruleId, tenantId);
    await this.audit.log({ tenantId, actorId, resource: 'assessment', resourceId: id, action: 'REMOVE_POOL_RULE', newValues: { ruleId } });
    return this.repo.findById(id, tenantId) as Promise<AssessmentDTO>;
  }

  async listForStudent(tenantId: string, studentId: string, pagination: PaginationRequest) {
    return this.repo.listForStudent(tenantId, studentId, pagination);
  }
}
