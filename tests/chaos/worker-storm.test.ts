import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import prisma, { resetDatabase, disconnectDatabase } from '../utils/db-reset';
import { MemoryEventBus } from '../../server/src/core/infrastructure/events/event-bus';
import { OutboxWorker } from '../../server/src/core/infrastructure/events/outbox.worker';
import { v4 as uuidv4 } from 'uuid';

describe('Gate 15: Chaos Testing - Concurrent Worker Storm', () => {
  let tenantId: string;

  beforeEach(async () => {
    await resetDatabase();
    const tenant = await prisma.tenant.create({ data: { name: 'Chaos', code: `C-${uuidv4()}`, status: 'ACTIVE' } });
    tenantId = tenant.id;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('Scenario E: FOR UPDATE SKIP LOCKED prevents duplicate processing under extreme concurrency', async () => {
    const TOTAL_EVENTS = 100;
    const NUM_WORKERS = 5;

    // 1. Seed 100 Pending Events
    console.log(`\n🌪️ Seeding ${TOTAL_EVENTS} Outbox Events...`);
    const eventsToCreate = Array.from({ length: TOTAL_EVENTS }).map((_, i) => ({
      tenantId,
      eventType: 'chaos.test_event',
      aggregateType: 'Chaos',
      aggregateId: uuidv4(),
      payload: { eventName: 'chaos.test_event', metadata: { eventId: uuidv4(), testIndex: i } },
      status: 'PENDING' as const
    }));

    await prisma.outboxEvent.createMany({ data: eventsToCreate });

    // 2. Setup a custom Event Bus that counts actual executions
    let totalExecuted = 0;
    const executionMap = new Map<string, number>(); // Tracks how many times an event ID was processed
    
    const chaosEventBus = new MemoryEventBus();
    chaosEventBus.subscribe('chaos.test_event', async (event: any) => {
      // Intentionally add jitter (10-50ms delay) to keep transactions open longer
      // maximizing the chance of a race condition if SKIP LOCKED fails.
      await new Promise(r => setTimeout(r, Math.random() * 40 + 10));
      
      totalExecuted++;
      const current = executionMap.get(event.metadata?.eventId) || 0;
      executionMap.set(event.metadata?.eventId, current + 1);
    });

    // 3. Instantiate 5 Concurrent Workers
    console.log(`🌪️ Spawning ${NUM_WORKERS} Concurrent Workers...`);
    const workers = Array.from({ length: NUM_WORKERS }).map(() => new OutboxWorker(prisma, chaosEventBus));

    // 4. Release the Hounds (Start all workers simultaneously)
    workers.forEach(w => w.start(50)); // Poll every 50ms

    // 5. Wait for the storm to settle (Wait 3 seconds)
    await new Promise(r => setTimeout(r, 3000));

    // 6. Stop all workers
    workers.forEach(w => w.stop());

    // 7. ASSERTIONS
    const publishedEvents = await prisma.outboxEvent.count({ where: { status: 'PUBLISHED' } });
    const pendingEvents = await prisma.outboxEvent.count({ where: { status: 'PENDING' } });

    console.log(`🌪️ Storm settled. Published: ${publishedEvents}, Pending: ${pendingEvents}, Executed: ${totalExecuted}`);

    // Expect exactly 100 events published in DB
    expect(publishedEvents).toBe(TOTAL_EVENTS);
    expect(pendingEvents).toBe(0);

    // CRITICAL: Expect exactly 100 executions. 
    // If it's > 100, we have duplicate delivery. If < 100, we lost data.
    expect(totalExecuted).toBe(TOTAL_EVENTS);
  }, 10000); // 10s timeout
});
