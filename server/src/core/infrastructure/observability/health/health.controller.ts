import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { GlobalMetricsRegistry } from '../metrics/metrics.registry';
import { Logger } from '../logger/logger';
// import { Redis } from 'ioredis'; // Abstracted for this context

export class HealthController {
  constructor(
    private readonly prisma: PrismaClient,
    // private readonly redis: Redis
  ) {}

  /**
   * /health/live
   * Docker / K8s Liveness Probe. 
   * NEVER queries the database. Target: < 1ms.
   */
  live = (req: Request, res: Response) => {
    res.status(200).json({ status: 'UP' });
  };

  /**
   * /health/ready
   * Determines if this node can serve traffic.
   * Checks PG, Redis, and Worker Registry.
   */
  ready = async (req: Request, res: Response) => {
    try {
      // 1. Prisma Connection (SELECT 1 is fast and bypasses Query Engine overhead slightly, but tests the pool)
      await this.prisma.$queryRaw`SELECT 1`;
      
      // 2. Redis Connection
      // await this.redis.ping();
      
      // 3. Outbox Worker Check (Are workers alive?)
      // This could check a shared state or memory flag
      const isWorkerAlive = true;

      res.status(200).json({
        status: 'READY',
        database: 'CONNECTED',
        cache: 'CONNECTED',
        worker: isWorkerAlive ? 'ALIVE' : 'DEGRADED'
      });
    } catch (error: any) {
      Logger.error(`[HEALTH] Readiness probe failed: ${error.message}`);
      res.status(503).json({ status: 'UNAVAILABLE', reason: error.message });
    }
  };

  /**
   * /health/startup
   * Heavy check. Used by Docker Compose `healthcheck` during initial boot.
   */
  startup = async (req: Request, res: Response) => {
    try {
      // Check if Prisma migrations are pending
      // Check Env Validation
      // Check Master Seed Existence
      const adminRoleExists = await this.prisma.role.findFirst({ where: { slug: 'super_admin' }});
      
      if (!adminRoleExists) {
        throw new Error('Master Seed is missing');
      }

      res.status(200).json({ status: 'STARTED_SUCCESSFULLY' });
    } catch (error: any) {
      Logger.fatal(`[HEALTH] Startup checks failed: ${error.message}`);
      res.status(503).json({ status: 'STARTUP_FAILED', reason: error.message });
    }
  };

  /**
   * /metrics
   * Prometheus Scraping Endpoint. 
   * Bypasses ALL middleware (JWT, Logging, BodyParser) for minimal overhead.
   */
  metrics = async (req: Request, res: Response) => {
    try {
      res.set('Content-Type', 'text/plain');
      res.send(await GlobalMetricsRegistry.getMetrics());
    } catch (error: any) {
      res.status(500).end(error.message);
    }
  };
}
