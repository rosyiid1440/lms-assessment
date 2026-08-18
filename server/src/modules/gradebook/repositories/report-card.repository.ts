import { PrismaClient, Prisma } from '@prisma/client';
import { ReportCardItemDTO } from '../dtos/gradebook.dto';

export interface IReportCardRepository {
  findByStudentSemester(studentId: string, semesterId: string): Promise<any | null>;
  findById(id: string, tenantId: string): Promise<any | null>;
  list(tenantId: string, filter: { semesterId?: string; studentId?: string; status?: string; classId?: string }, pagination: { page: number; limit: number }): Promise<{ data: any[]; total: number }>;
  build(data: {
    tenantId: string;
    studentId: string;
    semesterId: string;
    studentSnapshotInfo: any;
    attendanceSummary: any;
    homeroomTeacherNote?: string;
    items: ReportCardItemDTO[];
  }): Promise<any>;
  transition(id: string, tenantId: string, nextStatus: string, expectedVersion: number, actorId: string): Promise<any>;
}

export class PrismaReportCardRepository implements IReportCardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByStudentSemester(studentId: string, semesterId: string): Promise<any | null> {
    return this.prisma.reportCard.findFirst({
      where: { studentId, semesterId },
      include: { items: true },
    });
  }

  async findById(id: string, tenantId: string): Promise<any | null> {
    return this.prisma.reportCard.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });
  }

  async list(tenantId: string, filter: { semesterId?: string; studentId?: string; status?: string }, pagination: { page: number; limit: number }): Promise<{ data: any[]; total: number }> {
    const where: Prisma.ReportCardWhereInput = { tenantId };
    if (filter.semesterId) where.semesterId = filter.semesterId;
    if (filter.studentId) where.studentId = filter.studentId;
    if (filter.status) where.status = filter.status as any;

    const [total, data] = await Promise.all([
      this.prisma.reportCard.count({ where }),
      this.prisma.reportCard.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
    ]);

    return { data, total };
  }

  async build(data: {
    tenantId: string;
    studentId: string;
    semesterId: string;
    studentSnapshotInfo: any;
    attendanceSummary: any;
    homeroomTeacherNote?: string;
    items: ReportCardItemDTO[];
  }): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.reportCard.findFirst({
        where: { studentId: data.studentId, semesterId: data.semesterId },
      });

      let reportCard;
      if (existing) {
        reportCard = await tx.reportCard.update({
          where: { id: existing.id },
          data: {
            version: { increment: 1 },
            status: 'DRAFT',
            studentSnapshotInfo: data.studentSnapshotInfo,
            attendanceSummary: data.attendanceSummary,
            homeroomTeacherNote: data.homeroomTeacherNote,
            publishedAt: null,
          },
        });
        await tx.reportCardItem.deleteMany({ where: { reportCardId: existing.id } });
      } else {
        reportCard = await tx.reportCard.create({
          data: {
            tenantId: data.tenantId,
            studentId: data.studentId,
            semesterId: data.semesterId,
            studentSnapshotInfo: data.studentSnapshotInfo,
            attendanceSummary: data.attendanceSummary,
            homeroomTeacherNote: data.homeroomTeacherNote,
          },
        });
      }

      if (data.items.length > 0) {
        await tx.reportCardItem.createMany({
          data: data.items.map((item) => ({
            tenantId: data.tenantId,
            reportCardId: reportCard.id,
            courseId: item.courseId,
            subjectName: item.subjectName,
            teacherName: item.teacherName,
            finalScore: item.finalScore,
            letterGrade: item.letterGrade,
            highestCompetencyDesc: item.highestCompetencyDesc,
            lowestCompetencyDesc: item.lowestCompetencyDesc,
          })),
        });
      }

      return tx.reportCard.findUnique({
        where: { id: reportCard.id },
        include: { items: true },
      });
    });
  }

  async transition(id: string, tenantId: string, nextStatus: string, expectedVersion: number, actorId: string): Promise<any> {
    const card = await this.prisma.reportCard.findFirst({ where: { id, tenantId } });
    if (!card) throw new Error('REPORT_CARD_NOT_FOUND');
    if (card.version !== expectedVersion) throw new Error('OCC_FAILED');

    const data: Prisma.ReportCardUpdateInput = {
      version: { increment: 1 },
      status: nextStatus as any,
    };
    if (nextStatus === 'PUBLISHED') data.publishedAt = new Date();

    return this.prisma.reportCard.update({
      where: { id },
      data,
      include: { items: true },
    });
  }
}
