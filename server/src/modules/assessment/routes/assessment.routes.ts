import { Router, Request, Response, NextFunction } from 'express';
import { AssessmentController } from '../controllers/assessment.controller';
import { validateRequest } from '../../../core/middleware/validation.middleware';
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  CategoryQuerySchema,
  CreateTagSchema,
  UpdateTagSchema,
  CreateQuestionSchema,
  UpdateQuestionSchema,
  QuestionQuerySchema,
  QuestionIdParamSchema,
  CreateAssessmentSchema,
  UpdateAssessmentSchema,
  AssessmentQuerySchema,
  AssessmentIdParamSchema,
  AttachQuestionsSchema,
  SetQuestionPointsSchema,
  BalancePointsSchema,
  RemoveQuestionParamSchema,
  CreatePoolRuleSchema,
  CreatePoolRuleParamSchema,
  PoolRuleIdParamSchema,
  SaveAnswerSchema,
  SaveAnswerParamSchema,
  GradeAnswerSchema,
  GradeAnswerParamSchema,
  ReviewQuerySchema,
  AttemptParamSchema,
} from '../validators/assessment.validator';
import { z } from 'zod';

const STAFF_ROLES = ['teacher', 'admin', 'super_admin'];
const STUDENT_ROLES = ['student'];

const requireStaff = (req: Request, res: Response, next: NextFunction) => {
  const role = (req as any).user?.roleSlug;
  if (!STAFF_ROLES.includes(role)) {
    return res.status(403).json({ type: 'https://api.lms.local/errors/AUTH_003', title: 'Permission Denied', status: 403, detail: 'Akses khusus guru/admin', instance: req.originalUrl, timestamp: new Date().toISOString() });
  }
  next();
};

const requireStudent = (req: Request, res: Response, next: NextFunction) => {
  const role = (req as any).user?.roleSlug;
  const studentId = (req as any).user?.studentId;
  if (!STUDENT_ROLES.includes(role) || !studentId) {
    return res.status(403).json({ type: 'https://api.lms.local/errors/AUTH_003', title: 'Permission Denied', status: 403, detail: 'Akses khusus siswa', instance: req.originalUrl, timestamp: new Date().toISOString() });
  }
  next();
};

const StatusActionSchema = z.object({ status: z.enum(['DRAFT', 'SCHEDULED', 'READY', 'RUNNING', 'FINISHED', 'REVIEW', 'PUBLISHED', 'ARCHIVED']) });
const QuestionStatusActionSchema = z.object({ status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']) });
const VersionParamSchema = z.object({ id: z.string().uuid(), version: z.coerce.number().int().min(1) });

export const createAssessmentRoutes = (controller: AssessmentController): Router => {
  const router = Router();

  // ------------------------------ CATEGORIES (staff)
  router.get('/categories', requireStaff, validateRequest({ query: CategoryQuerySchema }), controller.listCategories);
  router.post('/categories', requireStaff, validateRequest({ body: CreateCategorySchema }), controller.createCategory);
  router.put('/categories/:id', requireStaff, validateRequest({ params: QuestionIdParamSchema, body: UpdateCategorySchema }), controller.updateCategory);
  router.delete('/categories/:id', requireStaff, validateRequest({ params: QuestionIdParamSchema }), controller.deleteCategory);

  // ------------------------------ TAGS (staff)
  router.get('/tags', requireStaff, validateRequest({ query: CategoryQuerySchema }), controller.listTags);
  router.post('/tags', requireStaff, validateRequest({ body: CreateTagSchema }), controller.createTag);
  router.delete('/tags/:id', requireStaff, validateRequest({ params: QuestionIdParamSchema }), controller.deleteTag);

  // ------------------------------ QUESTIONS (staff)
  router.get('/questions', requireStaff, validateRequest({ query: QuestionQuerySchema }), controller.listQuestions);
  router.get('/questions/export', requireStaff, validateRequest({ query: QuestionQuerySchema }), controller.exportQuestions);
  router.post('/questions/import', requireStaff, validateRequest({ body: z.object({ rows: z.array(z.any()).max(5000) }) }), controller.importQuestions);
  router.get('/questions/:id', requireStaff, validateRequest({ params: QuestionIdParamSchema }), controller.getQuestion);
  router.post('/questions', requireStaff, validateRequest({ body: CreateQuestionSchema }), controller.createQuestion);
  router.put('/questions/:id', requireStaff, validateRequest({ params: QuestionIdParamSchema, body: UpdateQuestionSchema }), controller.updateQuestion);
  router.delete('/questions/:id', requireStaff, validateRequest({ params: QuestionIdParamSchema }), controller.deleteQuestion);
  router.post('/questions/:id/duplicate', requireStaff, validateRequest({ params: QuestionIdParamSchema }), controller.duplicateQuestion);
  router.post('/questions/:id/status', requireStaff, validateRequest({ params: QuestionIdParamSchema, body: QuestionStatusActionSchema }), controller.setQuestionStatus);
  router.get('/questions/:id/versions', requireStaff, validateRequest({ params: QuestionIdParamSchema }), controller.listVersions);
  router.post('/questions/:id/versions/:version/restore', requireStaff, validateRequest({ params: VersionParamSchema }), controller.restoreVersion);

  // ------------------------------ ASSESSMENTS (staff CRUD)
  router.get('/assessments', requireStaff, validateRequest({ query: AssessmentQuerySchema }), controller.listAssessments);
  router.get('/assessments/:id', requireStaff, validateRequest({ params: AssessmentIdParamSchema }), controller.getAssessment);
  router.post('/assessments', requireStaff, validateRequest({ body: CreateAssessmentSchema }), controller.createAssessment);
  router.put('/assessments/:id', requireStaff, validateRequest({ params: AssessmentIdParamSchema, body: UpdateAssessmentSchema }), controller.updateAssessment);
  router.delete('/assessments/:id', requireStaff, validateRequest({ params: AssessmentIdParamSchema }), controller.deleteAssessment);
  router.post('/assessments/:id/status', requireStaff, validateRequest({ params: AssessmentIdParamSchema, body: StatusActionSchema }), controller.setAssessmentStatus);

  // Questions attach/detach
  router.post('/assessments/:id/questions', requireStaff, validateRequest({ params: AssessmentIdParamSchema, body: AttachQuestionsSchema }), controller.attachQuestions);
  router.put('/assessments/:assessmentId/questions/:questionId', requireStaff, validateRequest({ params: RemoveQuestionParamSchema, body: SetQuestionPointsSchema }), controller.setQuestionPoints);
  router.post('/assessments/:id/questions/balance', requireStaff, validateRequest({ params: AssessmentIdParamSchema, body: BalancePointsSchema }), controller.balanceQuestionPoints);
  router.delete('/assessments/:assessmentId/questions/:questionId', requireStaff, validateRequest({ params: RemoveQuestionParamSchema }), controller.removeQuestion);

  // Pool rules
  router.post('/assessments/:id/pool-rules', requireStaff, validateRequest({ params: CreatePoolRuleParamSchema, body: CreatePoolRuleSchema }), controller.addPoolRule);
  router.delete('/assessments/:id/pool-rules/:ruleId', requireStaff, validateRequest({ params: PoolRuleIdParamSchema }), controller.removePoolRule);

  // Analytics & results (staff)
  router.get('/assessments/:id/analytics', requireStaff, validateRequest({ params: AssessmentIdParamSchema }), controller.getAnalytics);
  router.post('/assessments/:id/analytics/refresh', requireStaff, validateRequest({ params: AssessmentIdParamSchema }), controller.refreshAnalytics);
  router.get('/assessments/:id/results', requireStaff, validateRequest({ params: AssessmentIdParamSchema, query: z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }) }), controller.listResults);

  // ------------------------------ REVIEW / GRADING (staff)
  router.get('/reviews', requireStaff, validateRequest({ query: ReviewQuerySchema }), controller.listReviewable);
  router.get('/attempts/:attemptId/reviews', requireStaff, validateRequest({ params: z.object({ attemptId: z.string().uuid() }) }), controller.listPendingByAttempt);
  router.post('/attempts/:attemptId/questions/:questionId/grade', requireStaff, validateRequest({ params: GradeAnswerParamSchema, body: GradeAnswerSchema }), controller.gradeAnswer);
  router.post('/reviews/bulk', requireStaff, validateRequest({ body: z.object({ items: z.array(z.object({ attemptId: z.string().uuid(), questionId: z.string().uuid(), score: z.number().min(0).max(1000), feedback: z.string().max(4000).nullable().optional() })).max(200) }) }), controller.bulkGrade);

  // ------------------------------ ATTEMPTS (student)
  router.get('/my/assessments', requireStudent, validateRequest({ query: z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }) }), controller.listStudentAssessments);
  router.post('/assessments/:id/start', requireStudent, validateRequest({ params: AttemptParamSchema }), controller.startAttempt);
  router.post('/attempts/:id/resume', requireStudent, validateRequest({ params: AttemptParamSchema }), controller.resumeAttempt);
  router.put('/attempts/:attemptId/questions/:questionRefId/answer', requireStudent, validateRequest({ params: SaveAnswerParamSchema, body: SaveAnswerSchema }), controller.saveAnswer);
  router.post('/attempts/:id/submit', requireStudent, validateRequest({ params: AttemptParamSchema }), controller.submitAttempt);
  router.post('/attempts/:id/proctoring', requireStudent, validateRequest({ params: AttemptParamSchema, body: z.object({ tabSwitches: z.number().int().min(0).default(0).optional(), fullscreenExits: z.number().int().min(0).default(0).optional(), networkDisconnects: z.number().int().min(0).default(0).optional() }) }), controller.reportProctoring);
  router.post('/attempts/:id/lock', requireStudent, validateRequest({ params: AttemptParamSchema }), controller.lockAttempt);
  router.post('/attempts/:attemptId/unlock', requireStaff, validateRequest({ params: z.object({ attemptId: z.string().uuid() }) }), controller.unlockAttempt);
  router.get('/assessments/:id/monitor', requireStaff, validateRequest({ params: AssessmentIdParamSchema }), controller.monitorAssessment);
  router.get('/my/results', requireStudent, validateRequest({ query: z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }) }), controller.listStudentResults);

  return router;
};
