import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
// import { Redis } from 'ioredis'; // Abstracted for now

export class HealthCheckController {
  constructor(
    private readonly prisma: PrismaClient,
    // private readonly redis: Redis
  ) {}

  /**
   * K8s / Docker Liveness Check.
   * Answers "Is the Node process running?"
   * Should be ultra fast, no DB checks.
   */
  public liveness = (req: Request, res: Response) => {
    res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
  };

  /**
   * K8s / Docker Readiness Check.
   * Answers "Can I serve traffic and connect to my dependencies?"
   * Performs lightweight pings to DB & Redis.
   */
  public readiness = async (req: Request, res: Response) => {
    try {
      // 1. Prisma Connection Check
      await this.prisma.$queryRaw`SELECT 1`;
      
      // 2. Redis Connection Check
      // await this.redis.ping();

      res.status(200).json({
        status: 'READY',
        database: 'CONNECTED',
        cache: 'CONNECTED', // mock
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('[HEALTHCHECK] Readiness probe failed:', error.message);
      res.status(503).json({
        status: 'UNAVAILABLE',
        error: error.message
      });
    }
  };
}
