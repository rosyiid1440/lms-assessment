import { PrismaClient, Prisma } from '@prisma/client';
import type {
  PaginationRequest,
  SortRequest,
  PaginatedResult,
  AttemptDTO,
  ResultDTO,
  AnalyticsDTO,
} from '../dtos/assessment.dto';

export interface IAttemptRepository {
  findAttemptById(id: string, tenantId: string): Promise<any>;
  findActiveAttempt(assessmentId: string, studentId: string, tenantId: string): Promise<any>;
  countAttempts(assessmentId: string, studentId: string, tenantId: string): Promise<number>;
  createAttempt(data: {
    tenantId: string;
    assessmentId: string;
    studentId: string;
    attemptNumber: number;
    startedAt: Date;
    expectedEndTime: Date;
  }): Promise<any>;
  listAttemptQuestions(attemptId: string): Promise<any[]>;
  saveAnswer(attemptId: string, questionRefId: string, questionId: string, tenantId: string, data: { response: any; flagged?: boolean; visited?: boolean; timeSpentSeconds?: number }): Promise<void>;
  markQuestionAnswered(attemptId: string, questionId: string, isCorrect: boolean, points: number, maxPoints: number): Promise<void>;
  submitAttempt(id: string, tenantId: string, submittedAt: Date): Promise<boolean>;
  markAbandoned(id: string, tenantId: string): Promise<boolean>;
  updateAttemptScore(id: string, tenantId: string, data: { score: number; rawScore: number; totalPoints: number; correctCount: number; wrongCount: number; skippedCount: number; status: string; timeSpentSeconds: number }): Promise<boolean>;
  upsertResult(attemptId: string, tenantId: string, data: any): Promise<void>;
  listResultsByAssessment(assessmentId: string, tenantId: string, pagination: PaginationRequest): Promise<PaginatedResult<ResultDTO>>;
  listResultsByStudent(studentId: string, tenantId: string, pagination: PaginationRequest): Promise<PaginatedResult<ResultDTO>>;
  createResult(data: any): Promise<void>;
  getAnalytics(assessmentId: string, tenantId: string): Promise<AnalyticsDTO | null>;
  computeAnalytics(assessmentId: string, tenantId: string): Promise<AnalyticsDTO>;
  getAnswerForGrading(attemptId: string, questionId: string, tenantId: string): Promise<any>;
  listAnswersForAttempt(attemptId: string, tenantId: string): Promise<any[]>;
  findResultByAttempt(attemptId: string): Promise<any>;
  upsertPendingReview(attemptId: string, questionRefId: string, questionId: string, tenantId: string): Promise<void>;
  reportProctoring(attemptId: string, tenantId: string, data: { tabSwitches?: number; fullscreenExits?: number; networkDisconnects?: number; proctoringStatus?: string }): Promise<void>;
  lockAttempt(attemptId: string, tenantId: string, lockedById: string): Promise<boolean>;
  unlockAttempt(attemptId: string, tenantId: string): Promise<boolean>;
  listAttemptsForAssessment(assessmentId: string, tenantId: string): Promise<any[]>;
}

export class PrismaAttemptRepository implements IAttemptRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAttemptById(id: string, tenantId: string): Promise<any> {
    return this.prisma.attempt.findFirst({ where: { id, tenantId, deletedAt: null } });
  }

  async findActiveAttempt(assessmentId: string, studentId: string, tenantId: string): Promise<any> {
    return this.prisma.attempt.findFirst({
      where: { assessmentId, studentId, tenantId, deletedAt: null, status: 'IN_PROGRESS' },
    });
  }

  async countAttempts(assessmentId: string, studentId: string, tenantId: string): Promise<number> {
    return this.prisma.attempt.count({ where: { assessmentId, studentId, tenantId, deletedAt: null } });
  }

  async createAttempt(data: { tenantId: string; assessmentId: string; studentId: string; attemptNumber: number; startedAt: Date; expectedEndTime: Date }): Promise<any> {
    return this.prisma.attempt.create({
      data: {
        tenantId: data.tenantId,
        assessmentId: data.assessmentId,
        studentId: data.studentId,
        attemptNumber: data.attemptNumber,
        startedAt: data.startedAt,
        expectedEndTime: data.expectedEndTime,
        status: 'IN_PROGRESS',
      },
    });
  }

  async listAttemptQuestions(attemptId: string): Promise<any[]> {
    const refs = await this.prisma.assessmentQuestionRef.findMany({
      where: { assessment: { attempts: { some: { id: attemptId } } } },
      orderBy: { orderIndex: 'asc' },
      include: {
        question: {
          select: {
            id: true,
            type: true,
            prompt: true,
            options: true,
            caseData: true,
            answer: true,
            difficulty: true,
            bloomLevel: true,
            points: true,
            negativeMarking: true,
            estimatedTime: true,
          },
        },
        answers: { where: { attemptId } },
      },
    });
    return refs;
  }

  async saveAnswer(attemptId: string, questionRefId: string, questionId: string, tenantId: string, data: { response: any; flagged?: boolean; visited?: boolean; timeSpentSeconds?: number }): Promise<void> {
    const existing = await this.prisma.answer.findUnique({
      where: { attemptId_questionId: { attemptId, questionId } },
    });
    const common = {
      response: data.response !== undefined ? (data.response as Prisma.InputJsonValue | null) ?? Prisma.JsonNull : undefined,
      flagged: data.flagged,
      visited: data.visited === undefined ? true : data.visited,
      lastSavedAt: new Date(),
    };
    if (existing) {
      await this.prisma.answer.update({
        where: { attemptId_questionId: { attemptId, questionId } },
        data: { ...common, version: { increment: 1 } },
      });
    } else {
      await this.prisma.answer.create({
        data: {
          tenantId,
          attemptId,
          questionRefId,
          questionId,
          response: (data.response as Prisma.InputJsonValue | null) ?? Prisma.JsonNull,
          flagged: data.flagged ?? false,
          visited: data.visited ?? true,
          lastSavedAt: new Date(),
          gradingStatus: 'PENDING',
        },
      });
    }
  }

  async markQuestionAnswered(attemptId: string, questionId: string, isCorrect: boolean, points: number, maxPoints: number): Promise<void> {
    await this.prisma.answer.update({
      where: { attemptId_questionId: { attemptId, questionId } },
      data: {
        isCorrect,
        points,
        maxPoints,
        gradingStatus: 'AUTO_GRADED',
        version: { increment: 1 },
      },
    });
  }

  async submitAttempt(id: string, tenantId: string, submittedAt: Date): Promise<boolean> {
    const r = await this.prisma.attempt.updateMany({
      where: { id, tenantId, deletedAt: null, status: 'IN_PROGRESS' },
      data: { status: 'MANUAL_SUBMITTED', submittedAt },
    });
    return r.count > 0;
  }

  async markAbandoned(id: string, tenantId: string): Promise<boolean> {
    const r = await this.prisma.attempt.updateMany({
      where: { id, tenantId, deletedAt: null, status: 'IN_PROGRESS' },
      data: { status: 'ABANDONED' },
    });
    return r.count > 0;
  }

  async updateAttemptScore(id: string, tenantId: string, data: { score: number; rawScore: number; totalPoints: number; correctCount: number; wrongCount: number; skippedCount: number; status: string; timeSpentSeconds: number }): Promise<boolean> {
    const r = await this.prisma.attempt.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: {
        score: data.score,
        rawScore: data.rawScore,
        totalPoints: data.totalPoints,
        correctCount: data.correctCount,
        wrongCount: data.wrongCount,
        skippedCount: data.skippedCount,
        status: data.status as never,
        timeSpentSeconds: data.timeSpentSeconds,
        version: { increment: 1 },
      },
    });
    return r.count > 0;
  }

  async upsertResult(attemptId: string, tenantId: string, data: any): Promise<void> {
    const existing = await this.prisma.assessmentResult.findFirst({ where: { attemptId } });
    if (existing) {
      await this.prisma.assessmentResult.update({ where: { id: existing.id }, data });
    } else {
      await this.prisma.assessmentResult.create({ data: { ...data, tenantId } });
    }
  }

  async listResultsByAssessment(assessmentId: string, tenantId: string, pagination: PaginationRequest): Promise<PaginatedResult<ResultDTO>> {
    const where: Prisma.AssessmentResultWhereInput = { assessmentId, tenantId, deletedAt: null };
    const skip = (pagination.page - 1) * pagination.limit;
    const [total, rows] = await Promise.all([
      this.prisma.assessmentResult.count({ where }),
      this.prisma.assessmentResult.findMany({
        where,
        include: {
          attempt: { select: { submittedAt: true, timeSpentSeconds: true } },
        },
        skip,
        take: pagination.limit,
        orderBy: { percentage: 'desc' },
      }),
    ]);

    // Fetch student names separately
    const studentIds = [...new Set(rows.map((r) => r.studentId))];
    let studentsMap = new Map<string, { fullName: string; nis: string }>();
    if (studentIds.length > 0) {
      const profiles = await this.prisma.studentProfile.findMany({
        where: { id: { in: studentIds }, tenantId },
        select: { id: true, fullName: true, nis: true },
      });
      for (const p of profiles) {
        studentsMap.set(p.id, { fullName: p.fullName, nis: p.nis ?? '' });
      }
    }

    return {
      data: rows.map((r) => {
        const s = studentsMap.get(r.studentId);
        return {
          id: r.id,
          assessmentId: r.assessmentId,
          assessmentTitle: '',
          attemptId: r.attemptId,
          studentId: r.studentId,
          studentName: s?.fullName ?? '',
          nis: s?.nis ?? null,
          rawScore: r.rawScore,
          totalPoints: r.totalPoints,
          percentage: r.percentage,
          grade: r.grade,
          passed: r.passed,
          rank: r.rank,
          correctCount: r.correctCount,
          wrongCount: r.wrongCount,
          skippedCount: r.skippedCount,
          timeSpentSeconds: r.attempt?.timeSpentSeconds ?? 0,
          submittedAt: r.attempt?.submittedAt ?? null,
        };
      }),
      meta: { total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) },
    };
  }

  async listResultsByStudent(studentId: string, tenantId: string, pagination: PaginationRequest): Promise<PaginatedResult<ResultDTO>> {
    const where: Prisma.AssessmentResultWhereInput = { studentId, tenantId, deletedAt: null };
    const skip = (pagination.page - 1) * pagination.limit;
    const [total, rows] = await Promise.all([
      this.prisma.assessmentResult.count({ where }),
      this.prisma.assessmentResult.findMany({
        where,
        include: {
          attempt: { select: { submittedAt: true, timeSpentSeconds: true } },
          assessment: { select: { title: true } },
        },
        skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Fetch student names separately
    const studentIds = [...new Set(rows.map((r) => r.studentId))];
    let studentsMap = new Map<string, { fullName: string; nis: string }>();
    if (studentIds.length > 0) {
      const profiles = await this.prisma.studentProfile.findMany({
        where: { id: { in: studentIds }, tenantId },
        select: { id: true, fullName: true, nis: true },
      });
      for (const p of profiles) {
        studentsMap.set(p.id, { fullName: p.fullName, nis: p.nis ?? '' });
      }
    }

    return {
      data: rows.map((r) => {
        const s = studentsMap.get(r.studentId);
        return {
          id: r.id,
          assessmentId: r.assessmentId,
          assessmentTitle: r.assessment?.title ?? '',
          attemptId: r.attemptId,
          studentId: r.studentId,
          studentName: s?.fullName ?? '',
          nis: s?.nis ?? null,
          rawScore: r.rawScore,
          totalPoints: r.totalPoints,
          percentage: r.percentage,
          grade: r.grade,
          passed: r.passed,
          rank: r.rank,
          correctCount: r.correctCount,
          wrongCount: r.wrongCount,
          skippedCount: r.skippedCount,
          timeSpentSeconds: r.attempt?.timeSpentSeconds ?? 0,
          submittedAt: r.attempt?.submittedAt ?? null,
        };
      }),
      meta: { total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) },
    };
  }

  async createResult(data: any): Promise<void> {
    await this.prisma.assessmentResult.create({ data });
  }

  async findResultByAttempt(attemptId: string): Promise<any> {
    return this.prisma.assessmentResult.findFirst({ where: { attemptId } });
  }

  async upsertPendingReview(attemptId: string, questionRefId: string, questionId: string, tenantId: string): Promise<void> {
    await this.prisma.review.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: {
        tenantId,
        attemptId,
        questionRefId,
        questionId,
        reviewerId: null,
        status: 'PENDING',
        score: 0,
        version: 1,
      },
      update: {},
    });
  }

  async reportProctoring(attemptId: string, tenantId: string, data: { tabSwitches?: number; fullscreenExits?: number; networkDisconnects?: number; proctoringStatus?: string }): Promise<void> {
    const updateData: Prisma.AttemptUpdateManyMutationInput = {
      lastHeartbeatAt: new Date(),
    };
    if (data.tabSwitches) updateData.tabSwitches = { increment: data.tabSwitches };
    if (data.fullscreenExits) updateData.fullscreenExits = { increment: data.fullscreenExits };
    if (data.networkDisconnects) updateData.networkDisconnects = { increment: data.networkDisconnects };
    if (data.proctoringStatus) updateData.proctoringStatus = data.proctoringStatus as never;
    await this.prisma.attempt.updateMany({
      where: { id: attemptId, tenantId, deletedAt: null, status: { in: ['IN_PROGRESS', 'AUTO_SUBMITTED', 'MANUAL_SUBMITTED'] } },
      data: updateData,
    });
  }

  async lockAttempt(attemptId: string, tenantId: string, lockedById: string): Promise<boolean> {
    const r = await this.prisma.attempt.updateMany({
      where: { id: attemptId, tenantId, deletedAt: null, status: 'IN_PROGRESS' },
      data: { proctoringStatus: 'LOCKED', lockedAt: new Date(), lockedById },
    });
    return r.count > 0;
  }

  async unlockAttempt(attemptId: string, tenantId: string): Promise<boolean> {
    const r = await this.prisma.attempt.updateMany({
      where: { id: attemptId, tenantId, deletedAt: null, proctoringStatus: 'LOCKED' },
      data: { proctoringStatus: 'CLEAN', lockedAt: null, lockedById: null },
    });
    return r.count > 0;
  }

  async listAttemptsForAssessment(assessmentId: string, tenantId: string): Promise<any[]> {
    return this.prisma.attempt.findMany({
      where: { assessmentId, tenantId, deletedAt: null },
      select: {
        id: true,
        studentId: true,
        attemptNumber: true,
        status: true,
        proctoringStatus: true,
        startedAt: true,
        submittedAt: true,
        expectedEndTime: true,
        lockedAt: true,
        lockedById: true,
        tabSwitches: true,
        fullscreenExits: true,
        networkDisconnects: true,
      },
      orderBy: [{ studentId: 'asc' }, { attemptNumber: 'desc' }],
    });
  }

  async getAnalytics(assessmentId: string, tenantId: string): Promise<AnalyticsDTO | null> {
    const a = await this.prisma.assessmentAnalytics.findFirst({ where: { assessmentId, tenantId } });
    if (!a) return null;
    return {
      assessmentId: a.assessmentId,
      assessmentTitle: '',
      participantCount: a.participantCount,
      submittedCount: a.submittedCount,
      notSubmittedCount: a.notSubmittedCount,
      averageScore: a.averageScore,
      medianScore: a.medianScore,
      highestScore: a.highestScore,
      lowestScore: a.lowestScore,
      stdDeviation: a.stdDeviation,
      passRate: a.passRate,
      scoreHistogram: a.scoreHistogram,
      questionStats: a.questionStats,
      timeDistribution: a.timeDistribution,
      difficultyIndex: a.difficultyIndex,
      discrimination: a.discrimination,
      computedAt: a.computedAt,
    };
  }

  async computeAnalytics(assessmentId: string, tenantId: string): Promise<AnalyticsDTO> {
    const [assessment, results, participants, answers] = await Promise.all([
      this.prisma.assessment.findFirst({ where: { id: assessmentId, tenantId }, select: { title: true, passingScore: true, classId: true } }),
      this.prisma.assessmentResult.findMany({ where: { assessmentId, tenantId, deletedAt: null }, select: { percentage: true, rawScore: true, passed: true, timeSpentSeconds: true, correctCount: true, wrongCount: true, skippedCount: true } }),
      this.prisma.attempt.findMany({ where: { assessmentId, tenantId, deletedAt: null, status: { in: ['MANUAL_SUBMITTED', 'AUTO_SUBMITTED', 'COMPLETED'] } }, select: { studentId: true } }),
      this.prisma.answer.findMany({
        where: { attempt: { assessmentId, tenantId, deletedAt: null }, gradingStatus: 'AUTO_GRADED' },
        select: { questionId: true, isCorrect: true, points: true, maxPoints: true, timeSpentSeconds: true },
      }),
    ]);

    const scores = results.map((r) => r.percentage);
    const participantCount = participants.length;
    const submittedCount = results.length;
    const notSubmittedCount = Math.max(0, participantCount - submittedCount);

    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const sorted = [...scores].sort((a, b) => a - b);
    const median = sorted.length ? (sorted.length % 2 === 0 ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : sorted[Math.floor(sorted.length / 2)]) : 0;
    const highest = sorted.length ? sorted[sorted.length - 1] : 0;
    const lowest = sorted.length ? sorted[0] : 0;
    const variance = scores.length ? scores.reduce((a, b) => a + (b - avg) ** 2, 0) / scores.length : 0;
    const stdDev = Math.sqrt(variance);
    const passRate = results.length ? (results.filter((r) => r.passed).length / results.length) * 100 : 0;

    // Score histogram (10 buckets)
    const buckets = Array.from({ length: 10 }, () => 0);
    scores.forEach((s) => {
      const b = Math.min(9, Math.floor((Math.max(0, s) / 100) * 10));
      buckets[b]++;
    });
    const scoreHistogram = buckets.map((count, i) => ({ bucket: `${i * 10}-${(i + 1) * 10}`, count }));

    // Question stats
    const qMap = new Map<string, { correct: number; wrong: number; skipped: number; totalTime: number; count: number; optionDist: Record<string, number> }>();
    answers.forEach((a) => {
      const entry = qMap.get(a.questionId) ?? { correct: 0, wrong: 0, skipped: 0, totalTime: 0, count: 0, optionDist: {} };
      entry.count++;
      entry.totalTime += a.timeSpentSeconds ?? 0;
      if (a.isCorrect === true) entry.correct++;
      else if (a.isCorrect === false) entry.wrong++;
      else entry.skipped++;
      qMap.set(a.questionId, entry);
    });
    const questionStats = Array.from(qMap.entries()).map(([questionId, e]) => ({
      questionId,
      correctPct: e.count ? (e.correct / e.count) * 100 : 0,
      wrongPct: e.count ? (e.wrong / e.count) * 100 : 0,
      skippedPct: e.count ? (e.skipped / e.count) * 100 : 0,
      avgTime: e.count ? e.totalTime / e.count : 0,
    }));

    const timeDistribution = [0, 25, 50, 75, 100].map((start) => ({
      bucket: `${start}-${start + 25}%`,
      count: results.filter((r) => r.percentage >= start && r.percentage < start + 25).length,
    }));

    const payload: AnalyticsDTO = {
      assessmentId,
      assessmentTitle: assessment?.title ?? '',
      participantCount,
      submittedCount,
      notSubmittedCount,
      averageScore: Number(avg.toFixed(2)),
      medianScore: Number(median.toFixed(2)),
      highestScore: Number(highest.toFixed(2)),
      lowestScore: Number(lowest.toFixed(2)),
      stdDeviation: Number(stdDev.toFixed(2)),
      passRate: Number(passRate.toFixed(2)),
      scoreHistogram,
      questionStats,
      timeDistribution,
      difficultyIndex: questionStats,
      discrimination: questionStats,
      computedAt: new Date(),
    };

    await this.prisma.assessmentAnalytics.upsert({
      where: { assessmentId },
      create: {
        tenantId,
        assessmentId,
        participantCount,
        submittedCount,
        notSubmittedCount,
        averageScore: payload.averageScore,
        medianScore: payload.medianScore,
        highestScore: payload.highestScore,
        lowestScore: payload.lowestScore,
        stdDeviation: payload.stdDeviation,
        passRate: payload.passRate,
        scoreHistogram,
        questionStats,
        timeDistribution,
        computedAt: new Date(),
      },
      update: {
        participantCount,
        submittedCount,
        notSubmittedCount,
        averageScore: payload.averageScore,
        medianScore: payload.medianScore,
        highestScore: payload.highestScore,
        lowestScore: payload.lowestScore,
        stdDeviation: payload.stdDeviation,
        passRate: payload.passRate,
        scoreHistogram,
        questionStats,
        timeDistribution,
        computedAt: new Date(),
      },
    });

    return payload;
  }

  async getAnswerForGrading(attemptId: string, questionId: string, tenantId: string): Promise<any> {
    return this.prisma.answer.findFirst({
      where: { attemptId, questionId, tenantId },
      include: {
        questionRef: { include: { question: { select: { id: true, prompt: true, type: true, points: true, answer: true, explanation: true } } } },
      },
    });
  }

  async listAnswersForAttempt(attemptId: string, tenantId: string): Promise<any[]> {
    return this.prisma.answer.findMany({
      where: { attemptId, tenantId },
      include: {
        questionRef: {
          include: {
            question: { select: { id: true, prompt: true, type: true, points: true, answer: true, explanation: true, options: true } },
          },
        },
      },
    });
  }
}
