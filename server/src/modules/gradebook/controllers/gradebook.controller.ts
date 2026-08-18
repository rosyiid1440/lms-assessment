import { Request, Response, NextFunction } from 'express';
import { LedgerService } from '../services/ledger.service';
import { FormulaService } from '../services/formula.service';
import { ReportCardService } from '../services/report-card.service';
import { IProjectionRepository } from '../repositories/projection.repository';

export interface AuthUser {
  userId: string;
  tenantId: string;
  roleSlug: string;
  teacherId?: string | null;
  studentId?: string | null;
}

export const STAFF_ROLES = ['teacher', 'admin', 'super_admin'];

const actorOf = (req: Request): AuthUser => (req as any).user as AuthUser;
const paramOf = (req: Request, key: string): string => String((req.params as any)[key] ?? '');

export class GradebookController {
  constructor(
    private readonly ledger: LedgerService,
    private readonly formula: FormulaService,
    private readonly reportCard: ReportCardService,
    private readonly projectionRepo: IProjectionRepository,
  ) {}

  // ------------------------------------------------------------ LEDGER

  recordGrade = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const result = await this.ledger.recordGrade(user.tenantId, user.userId, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (e) { next(e); }
  };

  listLedger = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const q = req.query as any;
      const data = await this.ledger.listLedger(user.tenantId, {
        studentId: q.studentId,
        courseId: q.courseId,
        sourceType: q.sourceType,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  recomputeCourse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.ledger.recomputeForCourse(paramOf(req, 'courseId'), user.tenantId);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  getProjection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const q = req.query as any;
      if (q.studentId && q.courseId) {
        const proj = await this.projectionRepo.get(q.studentId, q.courseId);
        return res.json({ success: true, data: proj });
      }
      const list = q.courseId
        ? await this.projectionRepo.listByCourse(q.courseId, user.tenantId)
        : await this.projectionRepo.listByStudent(q.studentId ?? user.studentId, user.tenantId);
      res.json({ success: true, data: list });
    } catch (e) { next(e); }
  };

  // ------------------------------------------------------------ FORMULA

  getFormula = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.formula.getForCourse(paramOf(req, 'courseId'), user.tenantId);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  upsertFormula = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.formula.upsert(req.body.courseId, user.tenantId, user.userId, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  // ------------------------------------------------------------ REPORT CARD

  buildReportCard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.reportCard.build({ tenantId: user.tenantId, ...req.body });
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  };

  listReportCards = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const q = req.query as any;
      const result = await this.reportCard.list(
        user.tenantId,
        { semesterId: q.semesterId, studentId: q.studentId, status: q.status },
        { page: q.page, limit: q.limit },
      );
      res.json({ success: true, data: result.data, meta: { total: result.total, page: q.page, limit: q.limit } });
    } catch (e) { next(e); }
  };

  getReportCard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.reportCard.findById(paramOf(req, 'id'), user.tenantId);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  transitionReportCard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = actorOf(req);
      const data = await this.reportCard.transition(user.tenantId, user.userId, {
        tenantId: user.tenantId,
        reportCardId: paramOf(req, 'id'),
        ...req.body,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  };

  reportCardTransitions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const card = await this.reportCard.findById(paramOf(req, 'id'), actorOf(req).tenantId);
      const allowed = await this.reportCard.listTransitions(card.status);
      res.json({ success: true, data: { current: card.status, allowed } });
    } catch (e) { next(e); }
  };
}
