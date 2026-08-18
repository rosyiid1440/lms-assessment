import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { GradebookController } from './controllers/gradebook.controller';
import { createGradebookRoutes } from './routes/gradebook.routes';
import { PrismaLedgerRepository } from './repositories/ledger.repository';
import { PrismaFormulaRepository } from './repositories/formula.repository';
import { PrismaProjectionRepository } from './repositories/projection.repository';
import { PrismaReportCardRepository } from './repositories/report-card.repository';
import { LedgerService } from './services/ledger.service';
import { FormulaService } from './services/formula.service';
import { ReportCardService } from './services/report-card.service';

/**
 * Wires the Gradebook domain with constructor injection
 * (mirrors the assessment module DI pattern).
 */
export const buildGradebookModule = (prisma: PrismaClient): Router => {
  const ledgerRepo = new PrismaLedgerRepository(prisma);
  const formulaRepo = new PrismaFormulaRepository(prisma);
  const projectionRepo = new PrismaProjectionRepository(prisma);
  const reportCardRepo = new PrismaReportCardRepository(prisma);

  const ledgerService = new LedgerService(prisma, ledgerRepo, formulaRepo, projectionRepo);
  const formulaService = new FormulaService(formulaRepo);
  const reportCardService = new ReportCardService(prisma, reportCardRepo, projectionRepo, ledgerRepo);

  const controller = new GradebookController(ledgerService, formulaService, reportCardService, projectionRepo);

  return createGradebookRoutes(controller);
};
