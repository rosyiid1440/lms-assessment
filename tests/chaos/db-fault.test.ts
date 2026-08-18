import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import prisma, { resetDatabase, disconnectDatabase } from '../utils/db-reset';
import { GradeLedgerEngine } from '../../server/src/modules/gradebook/engine/ledger.engine';
import { ConflictException } from '../../server/src/core/exceptions/app.exception';
import { v4 as uuidv4 } from 'uuid';

describe('Gate 15: Chaos Testing - Database Resilience', () => {
  let tenantId: string;

  beforeEach(async () => {
    await resetDatabase();
    const tenant = await prisma.tenant.create({ data: { name: 'Chaos', code: `C-${uuidv4()}`, status: 'ACTIVE' } });
    tenantId = tenant.id;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('Scenario D: Database Timeout/Crash triggers full rollback with zero partial data', async () => {
    const studentId = uuidv4();
    const courseId = uuidv4();
    const semesterId = uuidv4();
    const referenceId = uuidv4();

    // Mock Repository that simulates a network timeout during the Projection Update phase
    // This happens AFTER the ledger entry was inserted into the transaction memory.
    try {
      await prisma.$transaction(async (tx) => {
        const faultyRepo = {
          appendEntry: async (data: any) => {
            const { expectedVersion, ...dbData } = data;
            await tx.gradeLedger.create({ data: dbData }); // Use tx!
          },
          calculateCurrentAbsoluteScore: async () => 85,
          updateProjection: async () => {
            throw new Error('NETWORK_TIMEOUT_SIMULATION');
          }
        };

        const engine = new GradeLedgerEngine(faultyRepo);

        await engine.recordGrade({
          tenantId, studentId, courseId, semesterId, referenceId,
          sourceType: 'ASSIGNMENT', scoreChange: 85, entryType: 'INITIAL_ENTRY', reason: 'Test', expectedVersion: 1,
          referenceVersion: 1, recordedById: tenantId
        });
      });
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e.message).toContain('NETWORK_TIMEOUT_SIMULATION');
    }

    // 🚨 CRUCIAL ASSERTION 🚨
    // The Ledger table MUST be absolutely empty because the transaction rolled back 
    // when the projection update failed. No partial "ghost" ledgers allowed.
    const ledgerCount = await prisma.gradeLedger.count();
    expect(ledgerCount).toBe(0);
  });
});
