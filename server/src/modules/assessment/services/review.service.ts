import { IAttemptRepository } from '../repositories/attempt.repository';
import { AuditLogger } from './audit.logger';
import type { PaginationRequest, SortRequest } from '../dtos/assessment.dto';
import { BusinessRuleException, ResourceNotFoundException } from '../../../core/exceptions/app.exception';
import type { PrismaClient } from '@prisma/client';

export class ReviewService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly attemptRepo: IAttemptRepository,
    private readonly audit: AuditLogger,
  ) {}

  async listReviewable(tenantId: string, pagination: PaginationRequest, sort: SortRequest, filters: { attemptId?: string; status?: string }) {
    const where: any = { tenantId, deletedAt: null };
    if (filters.attemptId) where.attemptId = filters.attemptId;
    if (filters.status) where.status = filters.status;

    const sortable = ['updatedAt', 'createdAt'].includes(sort.sortBy) ? sort.sortBy : 'updatedAt';
    const skip = (pagination.page - 1) * pagination.limit;
    const [total, rows] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        include: {
          attempt: { select: { id: true, studentId: true, assessmentId: true } },
          questionRef: { include: { question: { select: { id: true, prompt: true, type: true, points: true } } } },
        },
        skip,
        take: pagination.limit,
        orderBy: { [sortable]: sort.sortDir },
      }),
    ]);
    return {
      data: rows.map((r) => ({
        id: r.id,
        attemptId: r.attemptId,
        questionId: r.questionId,
        questionType: r.questionRef?.question?.type,
        prompt: r.questionRef?.question?.prompt,
        maxPoints: r.questionRef?.points ?? r.questionRef?.question?.points ?? 1,
        score: r.score,
        status: r.status,
        feedback: r.feedback,
        updatedAt: r.updatedAt,
      })),
      meta: { total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) },
    };
  }

  async listPendingByAttempt(tenantId: string, attemptId: string): Promise<any[]> {
    return this.prisma.review.findMany({
      where: { tenantId, attemptId, deletedAt: null },
      include: {
        questionRef: {
          include: {
            question: { select: { id: true, prompt: true, type: true, points: true, answer: true, explanation: true } },
            answers: { where: { attemptId }, select: { response: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async grade(tenantId: string, reviewerId: string, attemptId: string, questionId: string, data: { score: number; feedback?: string | null; comment?: string | null; privateNote?: string | null; regradeReason?: string; overrideReason?: string | null }): Promise<void> {
    const answer = await this.attemptRepo.getAnswerForGrading(attemptId, questionId, tenantId);
    if (!answer) throw new ResourceNotFoundException('Answer', questionId);

    const maxPoints = answer.questionRef?.points ?? answer.questionRef?.question?.points ?? 1;
    if (data.score > maxPoints) throw new BusinessRuleException(`Skor melebihi batas maksimal ${maxPoints}`);

    await this.prisma.$transaction([
      this.prisma.review.upsert({
        where: { attemptId_questionId: { attemptId, questionId } },
        create: {
          tenantId,
          attemptId,
          questionRefId: answer.questionRefId,
          questionId,
          reviewerId,
          status: 'COMPLETED',
          score: data.score,
          feedback: data.feedback ?? null,
          comment: data.comment ?? null,
          privateNote: data.privateNote ?? null,
          regradeReason: (data.regradeReason ?? 'MANUAL') as never,
          overrideReason: data.overrideReason ?? null,
          version: 1,
        },
        update: {
          status: 'COMPLETED',
          score: data.score,
          feedback: data.feedback ?? null,
          comment: data.comment ?? null,
          privateNote: data.privateNote ?? null,
          regradeReason: (data.regradeReason ?? 'MANUAL') as never,
          overrideReason: data.overrideReason ?? null,
          reviewerId,
          version: { increment: 1 },
        },
      }),
      this.prisma.answer.update({
        where: { attemptId_questionId: { attemptId, questionId } },
        data: {
          manualScore: data.score,
          points: data.score,
          maxPoints,
          gradingStatus: 'MANUAL_GRADED',
          feedback: data.feedback ?? null,
          version: { increment: 1 },
        },
      }),
    ]);

    await this.recomputeAttemptScore(tenantId, attemptId);
    await this.audit.log({ tenantId, actorId: reviewerId, resource: 'review', resourceId: attemptId, action: 'GRADE', newValues: { questionId, score: data.score } });
  }

  async bulkGrade(tenantId: string, reviewerId: string, items: { attemptId: string; questionId: string; score: number; feedback?: string | null }[]): Promise<{ graded: number }> {
    for (const item of items) {
      await this.grade(tenantId, reviewerId, item.attemptId, item.questionId, { score: item.score, feedback: item.feedback });
    }
    return { graded: items.length };
  }

  async overrideScore(tenantId: string, reviewerId: string, attemptId: string, questionId: string, data: { score: number; overrideReason?: string | null }): Promise<void> {
    await this.grade(tenantId, reviewerId, attemptId, questionId, {
      score: data.score,
      overrideReason: data.overrideReason ?? 'Manual override',
      regradeReason: 'OVERRIDE',
    });
  }

  private computeGrade(percentage: number): string {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'E';
  }

  private async recomputeAttemptScore(tenantId: string, attemptId: string): Promise<void> {
    const attempt = await this.attemptRepo.findAttemptById(attemptId, tenantId);
    if (!attempt) return;

    const answers = await this.attemptRepo.listAnswersForAttempt(attemptId, tenantId);
    const refs = await this.attemptRepo.listAttemptQuestions(attemptId);

    let rawScore = 0;
    let totalPoints = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    const answerMap = new Map(answers.map((a: any) => [a.questionId, a]));
    for (const ref of refs) {
      const maxPoints = ref.points ?? ref.question.points ?? 1;
      totalPoints += maxPoints;
      const ans = answerMap.get(ref.questionId);
      if (!ans || ans.points === 0 && ans.isCorrect === null && ans.gradingStatus !== 'MANUAL_GRADED') {
        if (ans?.gradingStatus === 'MANUAL_GRADED') {
          rawScore += ans.points ?? 0;
          if ((ans.points ?? 0) > 0) correctCount++;
          else wrongCount++;
        } else {
          skippedCount++;
        }
        continue;
      }
      if (ans.gradingStatus === 'MANUAL_GRADED') {
        rawScore += ans.points ?? 0;
        if ((ans.points ?? 0) > 0) correctCount++;
        else wrongCount++;
        continue;
      }
      rawScore += ans.points ?? 0;
      if (ans.isCorrect === true) correctCount++;
      else if (ans.isCorrect === false) wrongCount++;
    }

    const percentage = totalPoints ? (rawScore / totalPoints) * 100 : 0;
    const assessment = await this.prisma.assessment.findFirst({
      where: { id: attempt.assessmentId, tenantId },
      select: { passingScore: true },
    });
    const passing = assessment?.passingScore ?? 0;
    const existing = await this.attemptRepo.findResultByAttempt(attemptId);
    if (existing) {
      await this.attemptRepo.upsertResult(attemptId, tenantId, {
        rawScore,
        totalPoints,
        percentage: Number(percentage.toFixed(2)),
        grade: this.computeGrade(percentage),
        correctCount,
        wrongCount,
        skippedCount,
        passed: percentage >= passing,
      });
    }
    await this.attemptRepo.updateAttemptScore(attemptId, tenantId, {
      score: rawScore,
      rawScore,
      totalPoints,
      correctCount,
      wrongCount,
      skippedCount,
      status: 'COMPLETED',
      timeSpentSeconds: attempt.timeSpentSeconds,
    });
  }
}
