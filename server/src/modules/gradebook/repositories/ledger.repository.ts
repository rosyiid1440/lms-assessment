import { PrismaClient, Prisma } from '@prisma/client';
import { CreateLedgerEntryDTO } from '../dtos/gradebook.dto';
import { ILedgerRepository } from '../engine/ledger.engine';

export class PrismaLedgerRepository implements ILedgerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async appendEntry(data: CreateLedgerEntryDTO): Promise<any> {
    return this.prisma.gradeLedger.create({
      data: {
        tenantId: data.tenantId,
        studentId: data.studentId,
        courseId: data.courseId,
        semesterId: data.semesterId,
        sourceType: data.sourceType,
        referenceId: data.referenceId,
        referenceVersion: data.referenceVersion,
        cpId: data.cpId,
        tpId: data.tpId,
        entryType: data.entryType,
        scoreChange: data.scoreChange,
        weight: data.weight,
        reason: data.reason,
        recordedById: data.recordedById,
      },
    });
  }

  async listEntries(tenantId: string, filter: { studentId?: string; courseId?: string; sourceType?: string }): Promise<any[]> {
    const where: Prisma.GradeLedgerWhereInput = { tenantId };
    if (filter.studentId) where.studentId = filter.studentId;
    if (filter.courseId) where.courseId = filter.courseId;
    if (filter.sourceType) where.sourceType = filter.sourceType as any;

    return this.prisma.gradeLedger.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
    });
  }

  async findEntriesForProjection(studentId: string, courseId: string, tenantId: string): Promise<any[]> {
    return this.prisma.gradeLedger.findMany({
      where: { tenantId, studentId, courseId },
      orderBy: { recordedAt: 'asc' },
    });
  }

  async lastLedgerIdFor(studentId: string, courseId: string): Promise<string | null> {
    const last = await this.prisma.gradeLedger.findFirst({
      where: { studentId, courseId },
      orderBy: { recordedAt: 'desc' },
      select: { id: true },
    });
    return last?.id ?? null;
  }

  async upsertProjection(data: {
    tenantId: string;
    studentId: string;
    courseId: string;
    semesterId: string;
    finalScore: number;
    letterGrade: string;
    isPassed: boolean;
    lastLedgerId: string;
  }): Promise<any> {
    return this.prisma.gradeProjection.upsert({
      where: { studentId_courseId: { studentId: data.studentId, courseId: data.courseId } },
      create: {
        tenantId: data.tenantId,
        studentId: data.studentId,
        courseId: data.courseId,
        semesterId: data.semesterId,
        finalScore: data.finalScore,
        letterGrade: data.letterGrade,
        isPassed: data.isPassed,
        lastLedgerId: data.lastLedgerId,
      },
      update: {
        finalScore: data.finalScore,
        letterGrade: data.letterGrade,
        isPassed: data.isPassed,
        lastLedgerId: data.lastLedgerId,
      },
    });
  }
}
