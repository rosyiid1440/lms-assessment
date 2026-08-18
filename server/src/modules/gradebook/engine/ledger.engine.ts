import { CreateLedgerEntryDTO } from '../dtos/gradebook.dto';
import { ConflictException } from '../../../core/exceptions/app.exception';
import { GlobalMetrics } from '../../../core/observability/metric.publisher';

export interface ILedgerRepository {
  appendEntry(data: CreateLedgerEntryDTO): Promise<any>;
  listEntries(tenantId: string, filter: { studentId?: string; courseId?: string; sourceType?: string }): Promise<any[]>;
  findEntriesForProjection(studentId: string, courseId: string, tenantId: string): Promise<any[]>;
  lastLedgerIdFor(studentId: string, courseId: string): Promise<string | null>;
  upsertProjection(data: {
    tenantId: string;
    studentId: string;
    courseId: string;
    semesterId: string;
    finalScore: number;
    letterGrade: string;
    isPassed: boolean;
    lastLedgerId: string;
  }): Promise<any>;
}

export interface ProjectionResult {
  finalScore: number;
  letterGrade: string;
  isPassed: boolean;
}

/**
 * Immutable Academic Ledger Engine.
 * Enforces Append-Only rules for grades and recalculates the fast-read projection.
 * Target: <20ms for the common single-append path.
 */
export class GradeLedgerEngine {
  constructor(
    private readonly repo: ILedgerRepository,
    private readonly computeProjection: (entries: any[], tenantId: string, studentId: string, courseId: string, semesterId: string) => Promise<ProjectionResult>,
  ) {}

  /**
   * Appends a new grade entry and recalculates the fast-read projection.
   */
  async recordGrade(data: CreateLedgerEntryDTO): Promise<number> {
    const startTime = process.hrtime();

    try {
      await this.repo.appendEntry(data);

      const entries = await this.repo.findEntriesForProjection(data.studentId, data.courseId, data.tenantId);
      const { finalScore, letterGrade, isPassed } = await this.computeProjection(
        entries, data.tenantId, data.studentId, data.courseId, data.semesterId,
      );
      const lastLedgerId = await this.repo.lastLedgerIdFor(data.studentId, data.courseId);

      await this.repo.upsertProjection({
        tenantId: data.tenantId,
        studentId: data.studentId,
        courseId: data.courseId,
        semesterId: data.semesterId,
        finalScore,
        letterGrade,
        isPassed,
        lastLedgerId: lastLedgerId ?? '',
      });

      const diff = process.hrtime(startTime);
      GlobalMetrics.recordHistogram('grade_ledger_entry_latency_ms', diff[0] * 1e3 + diff[1] * 1e-6);

      return finalScore;
    } catch (error: any) {
      if (error?.code === 'P2002' || error?.message === 'OCC_FAILED') {
        throw new ConflictException('Concurrent grade modification detected. Please refresh.');
      }
      throw error;
    }
  }
}
