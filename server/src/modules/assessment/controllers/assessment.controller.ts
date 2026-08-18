import { Request, Response, NextFunction } from 'express';
import { QuestionBankService } from '../services/question-bank.service';
import { AssessmentService } from '../services/assessment.service';
import { AttemptService } from '../services/attempt.service';
import { ReviewService } from '../services/review.service';
import { AnalyticsService } from '../services/analytics.service';

export interface AuthUser {
  userId: string;
  tenantId: string;
  roleSlug: string;
  teacherId?: string | null;
  studentId?: string | null;
}

export const STAFF_ROLES = ['teacher', 'admin', 'super_admin'];

const actorOf = (req: Request): AuthUser => (req as any).user as AuthUser;

const paramOf = (req: Request, key: string): string => {
  const v = (req.params as any)[key];
  return Array.isArray(v) ? String(v[0] ?? '') : String(v ?? '');
};

export class AssessmentController {
  constructor(
    private readonly questionBank: QuestionBankService,
    private readonly assessment: AssessmentService,
    private readonly attempt: AttemptService,
    private readonly review: ReviewService,
    private readonly analytics: AnalyticsService,
  ) {}

  // ------------------------------------------------------------ CATEGORIES

  listCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.questionBank.listCategories(user.tenantId, (req.query as any).parentId, (req.query as any).search);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  createCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.questionBank.createCategory(user.tenantId, user.userId, req.body);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  };

  updateCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.questionBank.updateCategory(user.tenantId, user.userId, paramOf(req, 'id'), req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      await this.questionBank.deleteCategory(user.tenantId, user.userId, paramOf(req, 'id'));
      res.json({ success: true });
    } catch (e) { next(e); }
  };

  // ------------------------------------------------------------ TAGS

  listTags = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.questionBank.listTags(user.tenantId, (req.query as any).search);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  createTag = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.questionBank.createTag(user.tenantId, user.userId, req.body);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  };

  deleteTag = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      await this.questionBank.deleteTag(user.tenantId, user.userId, paramOf(req, 'id'));
      res.json({ success: true });
    } catch (e) { next(e); }
  };

  // ------------------------------------------------------------ QUESTIONS

  listQuestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const { page, limit, sortBy, sortDir, ...filters } = req.query as any;
      const finalFilters = { ...filters };
      // "mine=true" -> only questions created by the requesting teacher/admin
      if (finalFilters.mine === 'true' || finalFilters.mine === true) {
        finalFilters.createdById = user.userId;
      }
      delete finalFilters.mine;
      const result = await this.questionBank.listQuestions(
        user.tenantId,
        finalFilters,
        { page, limit },
        { sortBy, sortDir },
      );
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (e) { next(e); }
  };

  getQuestion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.questionBank.getQuestion(user.tenantId, paramOf(req, 'id'));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  createQuestion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.questionBank.createQuestion(user.tenantId, user.userId, req.body);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  };

  updateQuestion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.questionBank.updateQuestion(user.tenantId, user.userId, paramOf(req, 'id'), req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  deleteQuestion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      await this.questionBank.deleteQuestion(user.tenantId, user.userId, paramOf(req, 'id'));
      res.json({ success: true });
    } catch (e) { next(e); }
  };

  duplicateQuestion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.questionBank.duplicateQuestion(user.tenantId, user.userId, paramOf(req, 'id'));
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  };

  setQuestionStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.questionBank.setStatus(user.tenantId, user.userId, paramOf(req, 'id'), req.body.status);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  listVersions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.questionBank.listVersions(user.tenantId, paramOf(req, 'id'));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  restoreVersion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.questionBank.restoreVersion(user.tenantId, user.userId, paramOf(req, 'id'), Number(paramOf(req, 'version')));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  importQuestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.questionBank.importQuestions(user.tenantId, user.userId, req.body.rows ?? []);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  exportQuestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const { sortBy, sortDir, ...filters } = req.query as any;
      const data = await this.questionBank.exportQuestions(user.tenantId, filters);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  // ------------------------------------------------------------ ASSESSMENTS

  listAssessments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const { page, limit, sortBy, sortDir, ...filters } = req.query as any;
      const result = await this.assessment.list(user.tenantId, filters, { page, limit }, { sortBy, sortDir });
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (e) { next(e); }
  };

  getAssessment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.assessment.get(user.tenantId, paramOf(req, 'id'));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  createAssessment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.assessment.create(user.tenantId, user.userId, req.body);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  };

  updateAssessment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.assessment.update(user.tenantId, user.userId, paramOf(req, 'id'), req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  deleteAssessment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      await this.assessment.delete(user.tenantId, user.userId, paramOf(req, 'id'));
      res.json({ success: true });
    } catch (e) { next(e); }
  };

  setAssessmentStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.assessment.setStatus(user.tenantId, user.userId, paramOf(req, 'id'), req.body.status);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  attachQuestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.assessment.attachQuestions(user.tenantId, user.userId, paramOf(req, 'id'), req.body.questionIds, req.body.points, req.body.pointsMap);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  setQuestionPoints = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.assessment.setQuestionPoints(user.tenantId, user.userId, paramOf(req, 'assessmentId'), paramOf(req, 'questionId'), req.body.points);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  balanceQuestionPoints = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.assessment.balanceQuestionPoints(user.tenantId, user.userId, paramOf(req, 'id'), req.body.totalPoints ?? 100);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  removeQuestion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.assessment.removeQuestion(user.tenantId, user.userId, paramOf(req, 'assessmentId'), paramOf(req, 'questionId'));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  addPoolRule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.assessment.addPoolRule(user.tenantId, user.userId, paramOf(req, 'id'), req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  removePoolRule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.assessment.removePoolRule(user.tenantId, user.userId, paramOf(req, 'id'), paramOf(req, 'ruleId'));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  // ------------------------------------------------------------ ATTEMPTS (STUDENT)

  startAttempt = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.attempt.start(user.tenantId, user.studentId!, paramOf(req, 'id'));
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  };

  resumeAttempt = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.attempt.resume(user.tenantId, user.studentId!, paramOf(req, 'id'));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  saveAnswer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      await this.attempt.saveAnswer(user.tenantId, user.studentId!, paramOf(req, 'attemptId'), paramOf(req, 'questionRefId'), req.body);
      res.json({ success: true });
    } catch (e) { next(e); }
  };

  submitAttempt = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.attempt.submit(user.tenantId, user.studentId!, paramOf(req, 'id'));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  reportProctoring = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.attempt.reportProctoring(user.tenantId, user.studentId!, paramOf(req, 'id'), req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  lockAttempt = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.attempt.lock(user.tenantId, user.studentId!, paramOf(req, 'id'));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  unlockAttempt = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.attempt.unlock(user.tenantId, user.userId, paramOf(req, 'attemptId'));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  monitorAssessment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.attempt.monitor(user.tenantId, paramOf(req, 'id'));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  listStudentAssessments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const { page, limit } = req.query as any;
      const result = await this.assessment.listForStudent(user.tenantId, user.studentId!, { page, limit });
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (e) { next(e); }
  };

  // ------------------------------------------------------------ REVIEW (TEACHER)

  listReviewable = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const { page, limit, sortBy, sortDir, ...filters } = req.query as any;
      const result = await this.review.listReviewable(user.tenantId, { page, limit }, { sortBy, sortDir }, filters);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (e) { next(e); }
  };

  listPendingByAttempt = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.review.listPendingByAttempt(user.tenantId, paramOf(req, 'attemptId'));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  gradeAnswer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      await this.review.grade(user.tenantId, user.userId, paramOf(req, 'attemptId'), paramOf(req, 'questionId'), req.body);
      res.json({ success: true });
    } catch (e) { next(e); }
  };

  bulkGrade = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.review.bulkGrade(user.tenantId, user.userId, req.body.items ?? []);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  // ------------------------------------------------------------ ANALYTICS

  getAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.analytics.getAssessmentAnalytics(user.tenantId, paramOf(req, 'id'));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  refreshAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.analytics.refreshAssessmentAnalytics(user.tenantId, paramOf(req, 'id'));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  listResults = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const { page, limit } = req.query as any;
      const result = await this.analytics.listResults(user.tenantId, paramOf(req, 'id'), { page, limit });
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (e) { next(e); }
  };

  listStudentResults = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const { page, limit } = req.query as any;
      const result = await this.analytics.listStudentResults(user.tenantId, user.studentId!, { page, limit });
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (e) { next(e); }
  };
}
