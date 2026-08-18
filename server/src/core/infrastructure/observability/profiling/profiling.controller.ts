import { Request, Response, NextFunction } from 'express';
import v8 from 'v8';
import { Session } from 'inspector';
import { monitorEventLoopDelay } from 'perf_hooks';
import { env } from '../../../config/env';
import { Logger } from '../logger/logger';

// Start monitoring the event loop immediately
const loopMonitor = monitorEventLoopDelay({ resolution: 20 });
loopMonitor.enable();

export class ProfilingController {

  /**
   * Security Guard: Only allows profiling if ENABLE_PROFILING=true
   * AND request comes from internal Docker network / localhost.
   */
  public requireProfilingEnabled = (req: Request, res: Response, next: NextFunction) => {
    if (!env.ENABLE_PROFILING) {
      Logger.warn({ ip: req.ip, path: req.path }, 'Blocked profiling attempt (ENABLE_PROFILING=false)');
      return res.status(403).json({ error: 'Profiling is disabled' });
    }
    
    // Check for internal IP (127.0.0.1, ::1, or docker subnets)
    const clientIp = req.ip || req.connection?.remoteAddress || '';
    const isLocal = clientIp === '127.0.0.1' || 
                    clientIp === '::1' || 
                    clientIp.includes('172.') || 
                    clientIp.includes('10.') || 
                    clientIp.includes('192.168.');
    
    if (!isLocal) {
      Logger.warn({ ip: clientIp, path: req.path }, 'Blocked external profiling attempt');
      return res.status(403).json({ error: 'Profiling only allowed from internal network' });
    }
    
    next();
  };

  /**
   * GET /profiling/heap
   * Generates a V8 Heap Snapshot (.heapsnapshot)
   * Warning: Blocks the main thread.
   */
  public getHeapSnapshot = (req: Request, res: Response) => {
    try {
      Logger.info('Generating heap snapshot...');
      const snapshotStream = v8.getHeapSnapshot();
      
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="heap-${Date.now()}.heapsnapshot"`);
      
      snapshotStream.pipe(res);
      snapshotStream.on('end', () => Logger.info('Heap snapshot completed'));
    } catch (error: any) {
      Logger.error({ error: error.message }, 'Failed to generate heap snapshot');
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * GET /profiling/cpu?durationMs=5000
   * Generates a CPU profile (.cpuprofile) using the V8 inspector
   */
  public getCpuProfile = async (req: Request, res: Response) => {
    const durationMs = parseInt(req.query.durationMs as string) || 5000;
    
    if (durationMs > 30000) {
      return res.status(400).json({ error: 'Duration cannot exceed 30000ms (30s) to prevent lockups' });
    }

    Logger.info({ durationMs }, 'Starting CPU profile');
    const session = new Session();
    session.connect();
    
    try {
      await new Promise<void>((resolve, reject) => {
        session.post('Profiler.enable', (err) => err ? reject(err) : resolve());
      });
      await new Promise<void>((resolve, reject) => {
        session.post('Profiler.start', (err) => err ? reject(err) : resolve());
      });

      // Wait for the specified duration before stopping the profiler
      setTimeout(async () => {
        try {
          const profile = await new Promise((resolve, reject) => {
            session.post('Profiler.stop', (err, params) => {
              if (err) return reject(err);
              resolve(params.profile);
            });
          });

          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="cpu-${Date.now()}.cpuprofile"`);
          res.json(profile);
          Logger.info('CPU profile completed');
        } catch (error: any) {
          Logger.error({ error: error.message }, 'Failed to stop CPU profile');
          res.status(500).json({ error: error.message });
        } finally {
          session.disconnect();
        }
      }, durationMs);

    } catch (error: any) {
      session.disconnect();
      Logger.error({ error: error.message }, 'Failed to start CPU profile');
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * GET /profiling/report
   * Generates a Node.js diagnostic report
   */
  public getDiagnosticReport = (req: Request, res: Response) => {
    try {
      const report = process.report?.getReport();
      if (!report) {
        return res.status(501).json({ error: 'Process report API not available' });
      }
      res.setHeader('Content-Type', 'application/json');
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * GET /profiling/memory
   * Returns current memory usage and event loop delay stats
   */
  public getMemoryStats = (req: Request, res: Response) => {
    const memory = process.memoryUsage();
    
    res.json({
      memory: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
        external: memory.external,
        arrayBuffers: memory.arrayBuffers
      },
      eventLoopDelayMs: {
        min: loopMonitor.min / 1e6,
        max: loopMonitor.max / 1e6,
        mean: loopMonitor.mean / 1e6,
        p50: loopMonitor.percentile(50) / 1e6,
        p95: loopMonitor.percentile(95) / 1e6,
        p99: loopMonitor.percentile(99) / 1e6,
      },
      uptimeSeconds: process.uptime()
    });
  };
}
