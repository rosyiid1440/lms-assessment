import { PrismaClient } from '@prisma/client';
import { IReportCardRepository } from '../repositories/report-card.repository';
import { IProjectionRepository } from '../repositories/projection.repository';
import { ILedgerRepository } from '../engine/ledger.engine';
import { ApprovalWorkflowStateMachine } from '../engine/approval.state-machine';
import { ResourceNotFoundException, BusinessRuleException } from '../../../core/exceptions/app.exception';
import { BuildReportCardDTO, WorkflowTransitionDTO, ReportCardItemDTO, ReportCardStatus } from '../dtos/gradebook.dto';

export class ReportCardService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly repo: IReportCardRepository,
    private readonly projectionRepo: IProjectionRepository,
    private readonly ledgerRepo: ILedgerRepository,
  ) {}

  async build(dto: BuildReportCardDTO) {
    const [student, semester] = await Promise.all([
      this.prisma.studentProfile.findUnique({ where: { id: dto.studentId, tenantId: dto.tenantId } }),
      this.prisma.semester.findUnique({ where: { id: dto.semesterId, tenantId: dto.tenantId } }),
    ]);
    if (!student) throw new ResourceNotFoundException('StudentProfile', dto.studentId);
    if (!semester) throw new ResourceNotFoundException('Semester', dto.semesterId);

    const studentSnapshotInfo = {
      fullName: student.fullName,
      nis: student.nis,
      nisn: student.nisn,
      gender: student.gender,
    };

    // Attendance summary from the student's records this semester
    const attendanceRecords = await this.prisma.attendanceRecord.findMany({
      where: { studentId: dto.studentId, tenantId: dto.tenantId },
      select: { status: true },
    });
    const attendanceSummary = {
      present: attendanceRecords.filter((r) => r.status === 'PRESENT').length,
      absent: attendanceRecords.filter((r) => r.status === 'ABSENT').length,
      late: attendanceRecords.filter((r) => r.status === 'LATE').length,
      excused: attendanceRecords.filter((r) => r.status === 'EXCUSED').length,
    };

    // Courses for this student's class in this semester
    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: { studentId: dto.studentId, semesterId: dto.semesterId, status: 'ACTIVE', tenantId: dto.tenantId, deletedAt: null },
      select: { classId: true },
    });
    const classIds = enrollments.map((e) => e.classId);

    const courses = await this.prisma.course.findMany({
      where: { classId: { in: classIds }, semesterId: dto.semesterId, tenantId: dto.tenantId, deletedAt: null },
      include: { subject: { select: { name: true } }, primaryTeacher: { select: { fullName: true } } },
    });

    const items: ReportCardItemDTO[] = [];
    for (const course of courses) {
      const projection = await this.projectionRepo.get(dto.studentId, course.id);
      const entries = await this.ledgerRepo.findEntriesForProjection(dto.studentId, course.id, dto.tenantId);
      const tpEntries = entries.filter((e: any) => e.tpId);

      let highestCompetencyDesc = 'Belum dievaluasi';
      let lowestCompetencyDesc = 'Belum dievaluasi';
      if (tpEntries.length > 0) {
        const byTp = new Map<string, number[]>();
        for (const e of tpEntries) {
          if (!byTp.has(e.tpId)) byTp.set(e.tpId, []);
          byTp.get(e.tpId)!.push(e.scoreChange);
        }
        const avgs = [...byTp.entries()].map(([tpId, scores]) => ({
          tpId,
          avg: scores.reduce((a: number, b: number) => a + b, 0) / scores.length,
        }));
        avgs.sort((a, b) => b.avg - a.avg);
        if (avgs.length > 0) {
          highestCompetencyDesc = `Kompetensi ${avgs[0].tpId} (rata-rata ${avgs[0].avg.toFixed(1)})`;
          lowestCompetencyDesc = `Kompetensi ${avgs[avgs.length - 1].tpId} (rata-rata ${avgs[avgs.length - 1].avg.toFixed(1)})`;
        }
      }

      items.push({
        courseId: course.id,
        subjectName: course.subject?.name ?? 'Tanpa Mapel',
        teacherName: course.primaryTeacher?.fullName ?? 'Belum diampu',
        finalScore: projection?.finalScore ?? 0,
        letterGrade: projection?.letterGrade ?? 'E',
        highestCompetencyDesc,
        lowestCompetencyDesc,
      });
    }

    return this.repo.build({
      tenantId: dto.tenantId,
      studentId: dto.studentId,
      semesterId: dto.semesterId,
      studentSnapshotInfo,
      attendanceSummary,
      homeroomTeacherNote: dto.homeroomTeacherNote,
      items,
    });
  }

  async findById(id: string, tenantId: string) {
    const card = await this.repo.findById(id, tenantId);
    if (!card) throw new ResourceNotFoundException('ReportCard', id);
    return card;
  }

  async list(tenantId: string, filter: { semesterId?: string; studentId?: string; status?: string }, pagination: { page: number; limit: number }) {
    return this.repo.list(tenantId, filter, pagination);
  }

  async transition(tenantId: string, actorId: string, dto: WorkflowTransitionDTO) {
    const card = await this.repo.findById(dto.reportCardId, tenantId);
    if (!card) throw new ResourceNotFoundException('ReportCard', dto.reportCardId);

    ApprovalWorkflowStateMachine.validateTransition(card.status, dto.nextStatus);

    try {
      return await this.repo.transition(dto.reportCardId, tenantId, dto.nextStatus, dto.expectedVersion, actorId);
    } catch (e: any) {
      if (e?.message === 'REPORT_CARD_NOT_FOUND') throw new ResourceNotFoundException('ReportCard', dto.reportCardId);
      if (e?.message === 'OCC_FAILED') throw new BusinessRuleException('Rapor telah diubah orang lain. Muat ulang dan coba lagi.');
      throw e;
    }
  }

  async listTransitions(current: string) {
    const status = current as ReportCardStatus;
    return ApprovalWorkflowStateMachine.allowedNext[status] ?? [];
  }
}
