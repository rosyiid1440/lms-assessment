import { IAttemptRepository } from '../repositories/attempt.repository';
import { IAssessmentRepository } from '../repositories/assessment.repository';
import { AuditLogger } from './audit.logger';
import { GradingEngine } from '../engines/grading.engine';
import type { AttemptDTO } from '../dtos/assessment.dto';
import { BusinessRuleException, ResourceNotFoundException } from '../../../core/exceptions/app.exception';

export class AttemptService {
  constructor(
    private readonly attemptRepo: IAttemptRepository,
    private readonly assessmentRepo: IAssessmentRepository,
    private readonly audit: AuditLogger,
  ) {}

  async start(tenantId: string, studentId: string, assessmentId: string): Promise<AttemptDTO> {
    const assessment = await this.assessmentRepo.findById(assessmentId, tenantId);
    if (!assessment) throw new ResourceNotFoundException('Assessment', assessmentId);

    const now = new Date();
    if (assessment.status !== 'READY' && assessment.status !== 'RUNNING' && assessment.status !== 'PUBLISHED') {
      throw new BusinessRuleException('Assessment belum dibuka untuk dikerjakan');
    }
    if (assessment.openDate && now < assessment.openDate) {
      throw new BusinessRuleException('Assessment belum dibuka');
    }
    if (assessment.closeDate && now > assessment.closeDate) {
      throw new BusinessRuleException('Assessment sudah ditutup');
    }

    // Resume existing in-progress attempt
    const active = await this.attemptRepo.findActiveAttempt(assessmentId, studentId, tenantId);
    if (active) {
      if (active.proctoringStatus === 'LOCKED') {
        throw new BusinessRuleException('Ujian Anda terkunci oleh sistem pengawasan. Hubungi admin sekolah untuk membuka kunci.');
      }
      return this.buildAttemptDTO(active.id, tenantId);
    }

    // Attempt limit check
    const count = await this.attemptRepo.countAttempts(assessmentId, studentId, tenantId);
    if (count >= assessment.attemptLimit) {
      throw new BusinessRuleException('Batas percobaan telah tercapai');
    }

    const startedAt = new Date();
    const expectedEndTime = new Date(startedAt.getTime() + assessment.durationMinutes * 60 * 1000);
    const attempt = await this.attemptRepo.createAttempt({
      tenantId,
      assessmentId,
      studentId,
      attemptNumber: count + 1,
      startedAt,
      expectedEndTime,
    });

    await this.audit.log({ tenantId, actorId: studentId, resource: 'attempt', resourceId: attempt.id, action: 'START' });
    return this.buildAttemptDTO(attempt.id, tenantId);
  }

  async resume(tenantId: string, studentId: string, attemptId: string): Promise<AttemptDTO> {
    const attempt = await this.attemptRepo.findAttemptById(attemptId, tenantId);
    if (!attempt) throw new ResourceNotFoundException('Attempt', attemptId);
    if (attempt.studentId !== studentId) throw new BusinessRuleException('Bukan attempt milik Anda');
    if (attempt.status === 'MANUAL_SUBMITTED' || attempt.status === 'AUTO_SUBMITTED' || attempt.status === 'COMPLETED') {
      throw new BusinessRuleException('Attempt sudah disubmit');
    }
    if (attempt.proctoringStatus === 'LOCKED') {
      throw new BusinessRuleException('Ujian Anda terkunci oleh sistem pengawasan. Hubungi admin sekolah untuk membuka kunci.');
    }
    return this.buildAttemptDTO(attempt.id, tenantId);
  }

  async lock(tenantId: string, studentId: string, attemptId: string): Promise<{ attemptId: string; proctoringStatus: string }> {
    const attempt = await this.attemptRepo.findAttemptById(attemptId, tenantId);
    if (!attempt) throw new ResourceNotFoundException('Attempt', attemptId);
    if (attempt.studentId !== studentId) throw new BusinessRuleException('Bukan attempt milik Anda');
    if (attempt.status === 'MANUAL_SUBMITTED' || attempt.status === 'AUTO_SUBMITTED' || attempt.status === 'COMPLETED') {
      throw new BusinessRuleException('Attempt sudah disubmit');
    }
    const ok = await this.attemptRepo.lockAttempt(attemptId, tenantId, studentId);
    if (!ok) throw new BusinessRuleException('Attempt tidak dapat dikunci');
    await this.audit.log({ tenantId, actorId: studentId, resource: 'attempt', resourceId: attemptId, action: 'LOCK' });
    return { attemptId, proctoringStatus: 'LOCKED' };
  }

  async unlock(tenantId: string, actorId: string, attemptId: string): Promise<{ attemptId: string; proctoringStatus: string }> {
    const attempt = await this.attemptRepo.findAttemptById(attemptId, tenantId);
    if (!attempt) throw new ResourceNotFoundException('Attempt', attemptId);
    if (attempt.proctoringStatus !== 'LOCKED') {
      throw new BusinessRuleException('Attempt tidak dalam keadaan terkunci');
    }
    const ok = await this.attemptRepo.unlockAttempt(attemptId, tenantId);
    if (!ok) throw new BusinessRuleException('Gagal membuka kunci attempt');
    await this.audit.log({ tenantId, actorId, resource: 'attempt', resourceId: attemptId, action: 'UNLOCK' });
    return { attemptId, proctoringStatus: 'CLEAN' };
  }

  async monitor(tenantId: string, assessmentId: string): Promise<any> {
    const assessment = await this.assessmentRepo.findById(assessmentId, tenantId);
    if (!assessment) throw new ResourceNotFoundException('Assessment', assessmentId);

    const attempts = await this.attemptRepo.listAttemptsForAssessment(assessmentId, tenantId);
    const byStudent = new Map<string, any>();
    for (const a of attempts) {
      const existing = byStudent.get(a.studentId);
      if (!existing || a.attemptNumber > existing.attemptNumber) byStudent.set(a.studentId, a);
    }

    let students = assessment.classId
      ? await this.assessmentRepo.listEnrolledStudents(tenantId, assessment.classId)
      : [];

    // Jika ada siswa yang sudah mengerjakan (attempt) tapi tidak terdaftar di classId (misal ujian Umum),
    // ambil profil mereka dan tambahkan ke daftar.
    const enrolledIds = new Set(students.map((s) => s.id));
    const unmappedIds = Array.from(byStudent.keys()).filter((id) => !enrolledIds.has(id));
    if (unmappedIds.length > 0) {
      const extraProfiles = await this.assessmentRepo.getStudentProfiles(tenantId, unmappedIds);
      students = [...students, ...extraProfiles];
    }

    const rows = students.map((s) => {
      const att = byStudent.get(s.id);
      let state = 'NOT_STARTED';
      if (att) {
        if (att.proctoringStatus === 'LOCKED') state = 'LOCKED';
        else if (att.status === 'MANUAL_SUBMITTED' || att.status === 'AUTO_SUBMITTED' || att.status === 'COMPLETED') state = 'SUBMITTED';
        else state = 'IN_PROGRESS';
      }
      return {
        studentId: s.id,
        fullName: s.fullName,
        nis: s.nis,
        nisn: s.nisn,
        state,
        attemptId: att?.id ?? null,
        attemptNumber: att?.attemptNumber ?? null,
        status: att?.status ?? null,
        proctoringStatus: att?.proctoringStatus ?? 'CLEAN',
        startedAt: att?.startedAt ?? null,
        submittedAt: att?.submittedAt ?? null,
        expectedEndTime: att?.expectedEndTime ?? null,
        lockedAt: att?.lockedAt ?? null,
        tabSwitches: att?.tabSwitches ?? 0,
        fullscreenExits: att?.fullscreenExits ?? 0,
        networkDisconnects: att?.networkDisconnects ?? 0,
      };
    });

    const count = (state: string) => rows.filter((r) => r.state === state).length;
    return {
      assessmentId,
      classId: assessment.classId,
      summary: {
        total: rows.length,
        notStarted: count('NOT_STARTED'),
        inProgress: count('IN_PROGRESS'),
        submitted: count('SUBMITTED'),
        locked: count('LOCKED'),
      },
      students: rows,
    };
  }

  async saveAnswer(tenantId: string, studentId: string, attemptId: string, questionRefId: string, data: { response: any; flagged?: boolean; visited?: boolean; timeSpentSeconds?: number }): Promise<void> {
    const attempt = await this.attemptRepo.findAttemptById(attemptId, tenantId);
    if (!attempt) throw new ResourceNotFoundException('Attempt', attemptId);
    if (attempt.studentId !== studentId) throw new BusinessRuleException('Bukan attempt milik Anda');
    if (attempt.status === 'MANUAL_SUBMITTED' || attempt.status === 'AUTO_SUBMITTED' || attempt.status === 'COMPLETED') {
      throw new BusinessRuleException('Attempt sudah disubmit, tidak dapat menyimpan jawaban');
    }
    if (attempt.proctoringStatus === 'LOCKED') {
      throw new BusinessRuleException('Ujian Anda terkunci oleh sistem pengawasan. Hubungi admin sekolah untuk membuka kunci.');
    }
    const now = new Date();
    if (attempt.expectedEndTime < now) {
      throw new BusinessRuleException('Waktu pengerjaan habis');
    }

    const refs = await this.attemptRepo.listAttemptQuestions(attemptId);
    const ref = refs.find((r: any) => r.id === questionRefId);
    if (!ref) throw new ResourceNotFoundException('QuestionRef', questionRefId);

    await this.attemptRepo.saveAnswer(attemptId, questionRefId, ref.questionId, tenantId, {
      response: data.response ?? null,
      flagged: data.flagged,
      visited: true,
      timeSpentSeconds: data.timeSpentSeconds,
    });

    // Auto-grade objective types on save
    const question = ref.question;
    if (!GradingEngine.requiresManualGrading(question.type)) {
      const result = GradingEngine.grade({
        questionType: question.type,
        response: data.response ?? null,
        answer: question.answer,
        options: question.options,
      });
      const maxPoints = ref.points ?? question.points ?? 1;
      const earned = result.isCorrect ? maxPoints : 0;
      await this.attemptRepo.markQuestionAnswered(attemptId, ref.questionId, result.isCorrect, earned, maxPoints);
    }
  }

  async reportProctoring(tenantId: string, studentId: string, attemptId: string, data: { tabSwitches?: number; fullscreenExits?: number; networkDisconnects?: number }): Promise<{ tabSwitches: number; fullscreenExits: number; networkDisconnects: number; proctoringStatus: string }> {
    const attempt = await this.attemptRepo.findAttemptById(attemptId, tenantId);
    if (!attempt) throw new ResourceNotFoundException('Attempt', attemptId);
    if (attempt.studentId !== studentId) throw new BusinessRuleException('Bukan attempt milik Anda');
    if (attempt.status === 'MANUAL_SUBMITTED' || attempt.status === 'AUTO_SUBMITTED' || attempt.status === 'COMPLETED') {
      throw new BusinessRuleException('Attempt sudah disubmit');
    }
    if (attempt.proctoringStatus === 'LOCKED') {
      throw new BusinessRuleException('Ujian Anda terkunci oleh sistem pengawasan. Hubungi admin sekolah untuk membuka kunci.');
    }

    const tabSwitches = attempt.tabSwitches + (data.tabSwitches ?? 0);
    const fullscreenExits = attempt.fullscreenExits + (data.fullscreenExits ?? 0);
    const networkDisconnects = attempt.networkDisconnects + (data.networkDisconnects ?? 0);
    const totalViolations = tabSwitches + fullscreenExits + networkDisconnects;
    let proctoringStatus = 'CLEAN';
    if (totalViolations >= 5) proctoringStatus = 'LOCKED';
    else if (totalViolations >= 2) proctoringStatus = 'WARNING';

    await this.attemptRepo.reportProctoring(attemptId, tenantId, {
      tabSwitches: data.tabSwitches,
      fullscreenExits: data.fullscreenExits,
      networkDisconnects: data.networkDisconnects,
      proctoringStatus,
    });
    return { tabSwitches, fullscreenExits, networkDisconnects, proctoringStatus };
  }

  async submit(tenantId: string, studentId: string, attemptId: string): Promise<{ attemptId: string; status: string }> {    const attempt = await this.attemptRepo.findAttemptById(attemptId, tenantId);
    if (!attempt) throw new ResourceNotFoundException('Attempt', attemptId);
    if (attempt.studentId !== studentId) throw new BusinessRuleException('Bukan attempt milik Anda');

    const submittedAt = new Date();
    if (attempt.status === 'MANUAL_SUBMITTED' || attempt.status === 'AUTO_SUBMITTED' || attempt.status === 'COMPLETED') {
      throw new BusinessRuleException('Attempt sudah disubmit');
    }

    // Finalize: grade all auto-gradeable unanswered -> skipped, subjective -> pending review
    const answers = await this.attemptRepo.listAnswersForAttempt(attemptId, tenantId);
    const answeredMap = new Map(answers.map((a: any) => [a.questionId, a]));
    const refs = await this.attemptRepo.listAttemptQuestions(attemptId);

    let rawScore = 0;
    let totalPoints = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    const timeSpent = Math.round((submittedAt.getTime() - attempt.startedAt.getTime()) / 1000);

    for (const ref of refs) {
      const maxPoints = ref.points ?? ref.question.points ?? 1;
      totalPoints += maxPoints;
      const ans = answeredMap.get(ref.questionId);
      if (!ans || !ans.response || (Array.isArray(ans.response) && ans.response.length === 0) || (ans.response && typeof ans.response === 'object' && !Array.isArray(ans.response) && (ans.response as any).keys !== undefined && !(ans.response as any).keys?.length)) {
        skippedCount++;
        await this.attemptRepo.saveAnswer(attemptId, ref.id, ref.questionId, tenantId, { response: null, visited: true });
        continue;
      }
      if (GradingEngine.requiresManualGrading(ref.question.type)) {
        // Leave for manual review — create a pending review record
        await this.attemptRepo.saveAnswer(attemptId, ref.id, ref.questionId, tenantId, { response: ans.response, visited: true });
        await this.attemptRepo.upsertPendingReview(attemptId, ref.id, ref.questionId, tenantId);
        continue;
      }
      const result = GradingEngine.grade({
        questionType: ref.question.type,
        response: ans.response,
        answer: ref.question.answer,
        options: ref.question.options,
      });
      const earned = result.isCorrect ? maxPoints : 0;
      await this.attemptRepo.markQuestionAnswered(attemptId, ref.questionId, result.isCorrect, earned, maxPoints);
      rawScore += earned;
      if (result.isCorrect) correctCount++;
      else wrongCount++;
    }

    await this.attemptRepo.submitAttempt(attemptId, tenantId, submittedAt);

    // Build result
    const resultPayload = {
      tenantId,
      assessmentId: attempt.assessmentId,
      attemptId,
      studentId,
      rawScore,
      totalPoints,
      percentage: totalPoints ? Number(((rawScore / totalPoints) * 100).toFixed(2)) : 0,
      grade: this.computeGrade(totalPoints ? (rawScore / totalPoints) * 100 : 0),
      passed: false, // updated below with passing score
      correctCount,
      wrongCount,
      skippedCount,
      timeSpentSeconds: timeSpent,
    };

    const assessment = await this.assessmentRepo.findById(attempt.assessmentId, tenantId);
    const passing = assessment?.passingScore ?? 0;
    resultPayload.passed = resultPayload.percentage >= passing;

    // Upsert result & update attempt score
    await this.attemptRepo.upsertResult(attemptId, tenantId, resultPayload);
    await this.attemptRepo.updateAttemptScore(attemptId, tenantId, { score: rawScore, rawScore, totalPoints, correctCount, wrongCount, skippedCount, status: 'COMPLETED', timeSpentSeconds: timeSpent });

    await this.audit.log({ tenantId, actorId: studentId, resource: 'attempt', resourceId: attemptId, action: 'SUBMIT' });
    return { attemptId, status: 'COMPLETED' };
  }

  private computeGrade(percentage: number): string {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'E';
  }

  private async buildAttemptDTO(attemptId: string, tenantId: string): Promise<AttemptDTO> {
    const attempt = await this.attemptRepo.findAttemptById(attemptId, tenantId);
    if (!attempt) throw new ResourceNotFoundException('Attempt', attemptId);
    const refs = await this.attemptRepo.listAttemptQuestions(attemptId);
    const now = new Date();
    const totalSecondsLeft = Math.max(0, Math.round((attempt.expectedEndTime.getTime() - now.getTime()) / 1000));

    const questions = refs.map((ref: any) => {
      const q = ref.question;
      const answer = ref.answers?.[0];
      let matchChoices: string[] | null = null;
      let orderItems: string[] | null = null;
      if (q.type === 'MATCHING') {
        const pairs = Array.isArray(q.answer) ? q.answer : (q.answer as any)?.pairs;
        if (Array.isArray(pairs)) {
          matchChoices = this.shuffleArray(pairs.map((p: any) => String(p.right)));
        }
      } else if (q.type === 'ORDERING') {
        const seq = Array.isArray(q.answer) ? q.answer : (q.answer as any)?.sequence;
        if (Array.isArray(seq)) {
          orderItems = this.shuffleArray(seq.map((s: any) => String(s)));
        }
      }
      return {
        refId: ref.id,
        questionId: q.id,
        orderIndex: ref.orderIndex,
        points: ref.points ?? q.points ?? 1,
        type: q.type,
        prompt: q.prompt,
        options: q.options ?? null,
        caseData: q.caseData ?? null,
        difficulty: q.difficulty,
        bloomLevel: q.bloomLevel,
        matchChoices,
        orderItems,
        timeSpentSeconds: answer?.timeSpentSeconds ?? 0,
        flagged: answer?.flagged ?? false,
        visited: answer?.visited ?? false,
        status: answer ? (answer.isCorrect !== null && answer.isCorrect !== undefined ? (answer.isCorrect ? 'CORRECT' : 'WRONG') : 'ANSWERED') : 'UNANSWERED',
        response: answer?.response ?? null,
      };
    });

    return {
      id: attempt.id,
      assessmentId: attempt.assessmentId,
      studentId: attempt.studentId,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      startedAt: attempt.startedAt,
      expectedEndTime: attempt.expectedEndTime,
      submittedAt: attempt.submittedAt,
      resumedAt: attempt.resumedAt,
      timeSpentSeconds: attempt.timeSpentSeconds,
      score: attempt.score,
      rawScore: attempt.rawScore,
      totalPoints: attempt.totalPoints,
      correctCount: attempt.correctCount,
      wrongCount: attempt.wrongCount,
      skippedCount: attempt.skippedCount,
      tabSwitches: attempt.tabSwitches ?? 0,
      fullscreenExits: attempt.fullscreenExits ?? 0,
      networkDisconnects: attempt.networkDisconnects ?? 0,
      proctoringStatus: attempt.proctoringStatus ?? 'CLEAN',
      questions,
      totalSecondsLeft,
    };
  }

  private shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
