import { IAttemptRepository } from '../repositories/attempt.repository';
import { IAssessmentRepository } from '../repositories/assessment.repository';
import { ResourceNotFoundException } from '../../../core/exceptions/app.exception';
import type { AnalyticsDTO } from '../dtos/assessment.dto';

export class AnalyticsService {
  constructor(
    private readonly attemptRepo: IAttemptRepository,
    private readonly assessmentRepo: IAssessmentRepository,
  ) {}

  async getAssessmentAnalytics(tenantId: string, assessmentId: string): Promise<AnalyticsDTO> {
    const assessment = await this.assessmentRepo.findById(assessmentId, tenantId);
    if (!assessment) throw new ResourceNotFoundException('Assessment', assessmentId);
    const cached = await this.attemptRepo.getAnalytics(assessmentId, tenantId);
    if (cached) return { ...cached, assessmentTitle: assessment.title };
    const computed = await this.attemptRepo.computeAnalytics(assessmentId, tenantId);
    return { ...computed, assessmentTitle: assessment.title };
  }

  async refreshAssessmentAnalytics(tenantId: string, assessmentId: string): Promise<AnalyticsDTO> {
    const assessment = await this.assessmentRepo.findById(assessmentId, tenantId);
    if (!assessment) throw new ResourceNotFoundException('Assessment', assessmentId);
    const computed = await this.attemptRepo.computeAnalytics(assessmentId, tenantId);
    return { ...computed, assessmentTitle: assessment.title };
  }

  async listResults(tenantId: string, assessmentId: string, pagination: { page: number; limit: number }) {
    const assessment = await this.assessmentRepo.findById(assessmentId, tenantId);
    if (!assessment) throw new ResourceNotFoundException('Assessment', assessmentId);
    return this.attemptRepo.listResultsByAssessment(assessmentId, tenantId, pagination);
  }

  async listStudentResults(tenantId: string, studentId: string, pagination: { page: number; limit: number }) {
    return this.attemptRepo.listResultsByStudent(studentId, tenantId, pagination);
  }
}
