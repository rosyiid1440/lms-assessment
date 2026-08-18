/**
 * Worker Host / Orchestrator
 * Runs entirely decoupled from the HTTP API.
 * Handles Graceful Shutdown.
 */
export class WorkerHost {
  private isShuttingDown = false;
  private activeJobs = 0;

  constructor() {
    this.setupGracefulShutdown();
  }

  // Simulated queue consumer
  public async consume(queue: any[], processor: (job: any) => Promise<void>) {
    // In reality, this connects to BullMQ or Kafka consumer loops
    setInterval(async () => {
      if (this.isShuttingDown) return;

      const job = queue.shift();
      if (job) {
        this.activeJobs++;
        try {
          await processor(job);
        } finally {
          this.activeJobs--;
        }
      }
    }, 100);
  }

  private setupGracefulShutdown() {
    const shutdown = async (signal: string) => {
      console.log(`\n[WORKER HOST] Received ${signal}. Initiating Graceful Shutdown...`);
      this.isShuttingDown = true;

      // Wait for active jobs to finish
      while (this.activeJobs > 0) {
        console.log(`[WORKER HOST] Waiting for ${this.activeJobs} active jobs to finish...`);
        await new Promise(res => setTimeout(res, 500));
      }

      console.log('[WORKER HOST] All jobs finished. Safe to exit.');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}
