import { BenchmarkHarness } from '../harness';
import prisma, { resetDatabase, disconnectDatabase } from '../../utils/db-reset';
import { v4 as uuidv4 } from 'uuid';

export async function runGradebookBenchmarks() {
  console.log('\n=======================================');
  console.log('   GRADEBOOK & LEDGER BENCHMARKS');
  console.log('=======================================');

  await resetDatabase();
  const tenant = await prisma.tenant.create({ data: { name: 'Bench', code: `b-${uuidv4().substring(0,8)}`, status: 'ACTIVE' }});
  
  // Pre-generate references to avoid UUID generation overhead in the loop
  const studentIds = Array.from({ length: 500 }).map(() => uuidv4());
  const courseId = uuidv4();
  const semesterId = uuidv4();
  const referenceId = uuidv4();

  // -----------------------------------------------------
  // 1. Ledger Append & Recalculation Benchmark
  // -----------------------------------------------------
  const writeResult = await BenchmarkHarness.run({
    name: 'Grade Ledger Entry & Projection Recalculation',
    concurrency: 100,      // 100 teachers submitting grades at exactly the same time
    totalOperations: 500,  // 500 grades total
    baselineP95Ms: 25,     // Goal: < 25ms per ledger transaction
  }, async (index) => {
    
    // Simulate what LedgerEngine does (Transaction: Insert Ledger -> Read Aggregation -> Upsert Projection)
    await prisma.$transaction(async (tx) => {
      await tx.gradeLedger.create({
        data: {
          tenantId: tenant.id,
          studentId: studentIds[index],
          courseId, semesterId, referenceId,
          sourceType: 'ASSIGNMENT', referenceVersion: 1,
          entryType: 'INITIAL_ENTRY', scoreChange: 85, reason: 'Bench',
          recordedById: tenant.id // mock
        }
      });

      const agg = await tx.gradeLedger.aggregate({
        where: { studentId: studentIds[index], courseId },
        _sum: { scoreChange: true }
      });
      const finalScore = agg._sum.scoreChange || 0;

      await tx.gradeProjection.upsert({
        where: { studentId_courseId: { studentId: studentIds[index], courseId } },
        update: { finalScore, lastLedgerId: referenceId },
        create: {
          tenantId: tenant.id, studentId: studentIds[index], courseId, semesterId,
          finalScore, letterGrade: 'A', isPassed: true, lastLedgerId: referenceId
        }
      });
    });

  });

  // -----------------------------------------------------
  // 2. Projection Read Benchmark (Dashboard Load)
  // -----------------------------------------------------
  const readResult = await BenchmarkHarness.run({
    name: 'Student Dashboard Projection Read',
    concurrency: 200,      // 200 students opening dashboard concurrently
    totalOperations: 1000, 
    baselineP95Ms: 10,     // Goal: < 10ms (O(1) read)
  }, async (index) => {
    
    // Simulates Dashboard Presenter fetching projection
    await prisma.gradeProjection.findUnique({
      where: { 
        studentId_courseId: { 
          studentId: studentIds[index % 500], // Loop over existing 500 students
          courseId 
        } 
      }
    });

  });

  return [writeResult, readResult];
}
