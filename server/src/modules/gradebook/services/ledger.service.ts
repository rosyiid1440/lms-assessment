import { CreateLedgerEntryDTO } from '../dtos/gradebook.dto';
import { GradeLedgerEngine, ILedgerRepository } from '../engine/ledger.engine';
import { computeFinalScore, masteryLevelOf } from '../engine/formula.engine';
import { IFormulaRepository } from '../repositories/formula.repository';
import { IProjectionRepository } from '../repositories/projection.repository';
import { PrismaClient } from '@prisma/client';
import { ResourceNotFoundException, BusinessRuleException } from '../../../core/exceptions/app.exception';

const VALID_SOURCES = ['ASSIGNMENT', 'EXAM', 'PROJECT_P5', 'OBSERVATION', 'ATTENDANCE'];

export class LedgerService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ledgerRepo: ILedgerRepository,
    private readonly formulaRepo: IFormulaRepository,
    private readonly projectionRepo: IProjectionRepository,
  ) {}

  private buildProjectionCalculator() {
    return async (entries: any[], tenantId: string, studentId: string, courseId: string, semesterId: string) => {
      const formula = await this.formulaRepo.findForCourse(courseId, tenantId);
      const config = formula
        ? {
            calculationType: formula.calculationType as any,
            passingScore: formula.passingScore,
            components: formula.components.map((c: any) => ({
              sourceType: c.sourceType,
              weightPercentage: c.weightPercentage,
              dropLowest: c.dropLowest,
            })),
          }
        : { calculationType: 'WEIGHTED_AVERAGE' as const, passingScore: 75, components: [] };

      return computeFinalScore(entries, config);
    };
  }

  async recordGrade(tenantId: string, actorId: string, dto: Omit<CreateLedgerEntryDTO, 'tenantId' | 'recordedById'>) {
    if (!VALID_SOURCES.includes(dto.sourceType)) {
      throw new BusinessRuleException(`Sumber nilai tidak valid: ${dto.sourceType}`);
    }

    const [student, course] = await Promise.all([
      this.prisma.studentProfile.findUnique({ where: { id: dto.studentId, tenantId } }),
      this.prisma.course.findUnique({ where: { id: dto.courseId, tenantId } }),
    ]);
    if (!student) throw new ResourceNotFoundException('StudentProfile', dto.studentId);
    if (!course) throw new ResourceNotFoundException('Course', dto.courseId);

    // Verify the reference (assignment or assessment) actually belongs to this course + tenant
    if (dto.sourceType === 'ASSIGNMENT') {
      const ref = await this.prisma.assignment.findFirst({
        where: { id: dto.referenceId, courseId: dto.courseId, tenantId },
      });
      if (!ref) throw new ResourceNotFoundException('Assignment', dto.referenceId);
    } else if (dto.sourceType === 'EXAM') {
      const ref = await this.prisma.assessment.findFirst({
        where: { id: dto.referenceId, courseId: dto.courseId, tenantId, deletedAt: null },
      });
      if (!ref) throw new ResourceNotFoundException('Assessment', dto.referenceId);
    }

    const engine = new GradeLedgerEngine(this.ledgerRepo, this.buildProjectionCalculator());

    const finalScore = await engine.recordGrade({
      ...dto,
      tenantId,
      recordedById: actorId,
      semesterId: dto.semesterId || course.semesterId,
      weight: dto.weight ?? 1,
    });

    // Competency summary (Kurikulum Merdeka linkage)
    if (dto.tpId) {
      const tpEntries = await this.ledgerRepo.findEntriesForProjection(dto.studentId, dto.courseId, tenantId);
      const tpScores = tpEntries
        .filter((e: any) => e.tpId === dto.tpId)
        .map((e: any) => e.entryType === 'PENALTY' ? e.scoreChange : e.scoreChange);
      if (tpScores.length > 0) {
        const formula = await this.formulaRepo.findForCourse(dto.courseId, tenantId);
        const passing = formula?.passingScore ?? 75;
        const avg = tpScores.reduce((a: number, b: number) => a + b, 0) / tpScores.length;
        await this.projectionRepo.upsertCompetency({
          tenantId,
          studentId: dto.studentId,
          courseId: dto.courseId,
          semesterId: dto.semesterId || course.semesterId,
          tpId: dto.tpId,
          masteryScore: Math.round(avg * 100) / 100,
          masteryLevel: masteryLevelOf(avg),
          needsRemedial: avg < passing,
        });
      }
    }

    return { finalScore, projection: await this.projectionRepo.get(dto.studentId, dto.courseId) };
  }

  async listLedger(tenantId: string, filter: { studentId?: string; courseId?: string; sourceType?: string }) {
    return this.ledgerRepo.listEntries(tenantId, filter);
  }

  async recomputeForCourse(courseId: string, tenantId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId, tenantId } });
    if (!course) throw new ResourceNotFoundException('Course', courseId);

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: { classId: course.classId, status: 'ACTIVE', tenantId, deletedAt: null },
      select: { studentId: true },
    });

    const results: any[] = [];
    for (const en of enrollments) {
      const entries = await this.ledgerRepo.findEntriesForProjection(en.studentId, courseId, tenantId);
      const { finalScore, letterGrade, isPassed } = await this.buildProjectionCalculator()(
        entries, tenantId, en.studentId, courseId, course.semesterId,
      );
      const lastLedgerId = await this.ledgerRepo.lastLedgerIdFor(en.studentId, courseId);
      const projection = await this.projectionRepo.upsert({
        tenantId,
        studentId: en.studentId,
        courseId,
        semesterId: course.semesterId,
        finalScore,
        letterGrade,
        isPassed,
        lastLedgerId: lastLedgerId ?? '',
      });
      results.push(projection);
    }

    return results;
  }
}
