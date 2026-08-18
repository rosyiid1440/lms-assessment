import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import prisma, { resetDatabase, disconnectDatabase } from '../../utils/db-reset';
import { measureLatency } from '../../utils/benchmark';
import { v4 as uuidv4 } from 'uuid';

describe('GradeLedger Integration Tests', () => {
  let tenantId: string;

  beforeEach(async () => {
    await resetDatabase();
    
    // Quick mock for necessary FKs
    const tenant = await prisma.tenant.create({
      data: { name: 'Ledger Tenant', code: `lt-${uuidv4().substring(0, 8)}`, status: 'ACTIVE' }
    });
    tenantId = tenant.id;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('should process Append-Only Ledger Entry atomically', async () => {
    // Generate isolated random IDs for the context
    const studentId = uuidv4();
    const courseId = uuidv4();
    const semesterId = uuidv4();
    const referenceId = uuidv4();

    // 1. Initial Entry (+80)
    await prisma.$transaction(async (tx) => {
      // Append Ledger
      await tx.gradeLedger.create({
        data: {
          tenantId, studentId, courseId, semesterId, referenceId,
          sourceType: 'ASSIGNMENT', referenceVersion: 1,
          entryType: 'INITIAL_ENTRY', scoreChange: 80, reason: 'First Submission',
          recordedById: uuidv4()
        }
      });

      // Calculate Sum (In a real repo, this aggregates the ledger)
      const aggregations = await tx.gradeLedger.aggregate({
        where: { studentId, referenceId },
        _sum: { scoreChange: true }
      });
      const finalScore = aggregations._sum.scoreChange || 0;

      // Upsert Projection
      await tx.gradeProjection.upsert({
        where: { studentId_courseId: { studentId, courseId } },
        update: { finalScore, lastLedgerId: referenceId },
        create: {
          tenantId, studentId, courseId, semesterId,
          finalScore, letterGrade: 'A', isPassed: true, lastLedgerId: referenceId
        }
      });
    });

    // 2. Correction Entry (+5)
    const { durationMs } = await measureLatency('Ledger Transaction', async () => {
      await prisma.$transaction(async (tx) => {
        await tx.gradeLedger.create({
          data: {
            tenantId, studentId, courseId, semesterId, referenceId,
            sourceType: 'ASSIGNMENT', referenceVersion: 1,
            entryType: 'CORRECTION', scoreChange: 5, reason: 'Teacher revised grading',
            recordedById: uuidv4()
          }
        });

        const aggregations = await tx.gradeLedger.aggregate({
          where: { studentId, referenceId },
          _sum: { scoreChange: true }
        });
        
        await tx.gradeProjection.update({
          where: { studentId_courseId: { studentId, courseId } },
          data: { finalScore: aggregations._sum.scoreChange || 0 }
        });
      });
    }, 100);

    // 3. Verification
    const ledgers = await prisma.gradeLedger.findMany({ where: { studentId } });
    expect(ledgers).toHaveLength(2); // History is preserved (Append-only)

    const projection = await prisma.gradeProjection.findUniqueOrThrow({
      where: { studentId_courseId: { studentId, courseId } }
    });
    
    // 80 + 5 = 85
    expect(projection.finalScore).toBe(85); 
  });
});
