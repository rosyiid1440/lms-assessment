import { PrismaClient, Prisma } from '@prisma/client';

export interface IProjectionRepository {
  get(studentId: string, courseId: string): Promise<any | null>;
  listByCourse(courseId: string, tenantId: string): Promise<any[]>;
  listByStudent(studentId: string, tenantId: string): Promise<any[]>;
  listStudentsForCourse(courseId: string, tenantId: string): Promise<string[]>;
  upsert(data: {
    tenantId: string;
    studentId: string;
    courseId: string;
    semesterId: string;
    finalScore: number;
    letterGrade: string;
    isPassed: boolean;
    lastLedgerId: string;
  }): Promise<any>;
  upsertCompetency(data: {
    tenantId: string;
    studentId: string;
    courseId: string;
    semesterId: string;
    tpId: string;
    masteryScore: number;
    masteryLevel: string;
    needsRemedial: boolean;
  }): Promise<any>;
}

export class PrismaProjectionRepository implements IProjectionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async get(studentId: string, courseId: string): Promise<any | null> {
    return this.prisma.gradeProjection.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
    });
  }

  async listByCourse(courseId: string, tenantId: string): Promise<any[]> {
    return this.prisma.gradeProjection.findMany({
      where: { courseId, tenantId },
    });
  }

  async listByStudent(studentId: string, tenantId: string): Promise<any[]> {
    return this.prisma.gradeProjection.findMany({
      where: { studentId, tenantId },
    });
  }

  async listStudentsForCourse(courseId: string, tenantId: string): Promise<string[]> {
    const rows = await this.prisma.gradeProjection.findMany({
      where: { courseId, tenantId },
      select: { studentId: true },
    });
    return rows.map((r) => r.studentId);
  }

  async upsert(data: {
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

  async upsertCompetency(data: {
    tenantId: string;
    studentId: string;
    courseId: string;
    semesterId: string;
    tpId: string;
    masteryScore: number;
    masteryLevel: string;
    needsRemedial: boolean;
  }): Promise<any> {
    return this.prisma.competencySummary.upsert({
      where: { studentId_courseId_tpId: { studentId: data.studentId, courseId: data.courseId, tpId: data.tpId } },
      create: { ...data, masteryLevel: data.masteryLevel as any },
      update: { masteryScore: data.masteryScore, masteryLevel: data.masteryLevel as any, needsRemedial: data.needsRemedial },
    });
  }
}
