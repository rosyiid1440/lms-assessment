import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AssessmentController } from './controllers/assessment.controller';
import { createAssessmentRoutes } from './routes/assessment.routes';
import { PrismaQuestionBankRepository } from './repositories/question-bank.repository';
import { PrismaAssessmentRepository } from './repositories/assessment.repository';
import { PrismaAttemptRepository } from './repositories/attempt.repository';
import { QuestionBankService } from './services/question-bank.service';
import { AssessmentService } from './services/assessment.service';
import { AttemptService } from './services/attempt.service';
import { ReviewService } from './services/review.service';
import { AnalyticsService } from './services/analytics.service';
import { AuditLogger } from './services/audit.logger';

/**
 * Wires the whole Assessment domain with constructor injection
 * (mirrors the existing `auth` module DI wiring in main.ts).
 */
export const buildAssessmentModule = (prisma: PrismaClient): Router => {
  const audit = new AuditLogger(prisma);
  const questionBankRepo = new PrismaQuestionBankRepository(prisma);
  const assessmentRepo = new PrismaAssessmentRepository(prisma);
  const attemptRepo = new PrismaAttemptRepository(prisma);

  const questionBankService = new QuestionBankService(questionBankRepo, audit);
  const assessmentService = new AssessmentService(assessmentRepo, questionBankRepo, audit);
  const attemptService = new AttemptService(attemptRepo, assessmentRepo, audit);
  const reviewService = new ReviewService(prisma, attemptRepo, audit);
  const analyticsService = new AnalyticsService(attemptRepo, assessmentRepo);

  const controller = new AssessmentController(
    questionBankService,
    assessmentService,
    attemptService,
    reviewService,
    analyticsService,
  );

  return createAssessmentRoutes(controller);
};
