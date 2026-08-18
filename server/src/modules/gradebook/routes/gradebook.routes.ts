import { Router, Request, Response, NextFunction } from 'express';
import { GradebookController } from '../controllers/gradebook.controller';
import { validateRequest } from '../../../core/middleware/validation.middleware';
import {
  CreateLedgerEntrySchema,
  LedgerQuerySchema,
  UpsertFormulaSchema,
  CourseParamSchema,
  BuildReportCardSchema,
  ReportCardQuerySchema,
  ReportCardParamSchema,
  TransitionSchema,
} from '../validators/gradebook.validator';
import { z } from 'zod';

const STAFF_ROLES = ['teacher', 'admin', 'super_admin'];

const requireStaff = (req: Request, res: Response, next: NextFunction) => {
  const role = (req as any).user?.roleSlug;
  if (!STAFF_ROLES.includes(role)) {
    return res.status(403).json({
      type: 'https://api.lms.local/errors/AUTH_003',
      title: 'Permission Denied',
      status: 403,
      detail: 'Akses khusus guru/admin',
      instance: req.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

const requireStaffOrOwnerStudent = (req: Request, res: Response, next: NextFunction) => {
  const role = (req as any).user?.roleSlug;
  if (STAFF_ROLES.includes(role)) return next();
  const studentId = (req as any).user?.studentId;
  if (role === 'student' && studentId) {
    const target = (req.query as any).studentId;
    if (!target || target === studentId) return next();
  }
  return res.status(403).json({
    type: 'https://api.lms.local/errors/AUTH_003',
    title: 'Permission Denied',
    status: 403,
    detail: 'Akses hanya untuk data Anda sendiri',
    instance: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
};

export const createGradebookRoutes = (controller: GradebookController): Router => {
  const router = Router();

  // ------------------------------ LEDGER (staff write, staff/owner read)
  router.post('/ledger', requireStaff, validateRequest({ body: CreateLedgerEntrySchema }), controller.recordGrade);
  router.get('/ledger', validateRequest({ query: LedgerQuerySchema }), requireStaffOrOwnerStudent, controller.listLedger);
  router.post('/courses/:courseId/recompute', requireStaff, validateRequest({ params: CourseParamSchema }), controller.recomputeCourse);

  // ------------------------------ PROJECTION (read model)
  router.get('/projection', validateRequest({ query: z.object({
    studentId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
  }) }), requireStaffOrOwnerStudent, controller.getProjection);

  // ------------------------------ FORMULA (staff)
  router.get('/formula/:courseId', requireStaff, validateRequest({ params: CourseParamSchema }), controller.getFormula);
  router.put('/formula', requireStaff, validateRequest({ body: UpsertFormulaSchema }), controller.upsertFormula);

  // ------------------------------ REPORT CARD (staff)
  router.post('/report-cards', requireStaff, validateRequest({ body: BuildReportCardSchema }), controller.buildReportCard);
  router.get('/report-cards', requireStaff, validateRequest({ query: ReportCardQuerySchema }), controller.listReportCards);
  router.get('/report-cards/:id', requireStaff, validateRequest({ params: ReportCardParamSchema }), controller.getReportCard);
  router.get('/report-cards/:id/transitions', requireStaff, validateRequest({ params: ReportCardParamSchema }), controller.reportCardTransitions);
  router.post('/report-cards/:id/transition', requireStaff, validateRequest({ params: ReportCardParamSchema, body: TransitionSchema }), controller.transitionReportCard);

  return router;
};
