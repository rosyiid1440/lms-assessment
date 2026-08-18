import { Router } from 'express';
import { ProfilingController } from './profiling.controller';

const router = Router();
const controller = new ProfilingController();

// Apply security guard to all profiling routes
router.use(controller.requireProfilingEnabled);

router.get('/heap', controller.getHeapSnapshot);
router.get('/cpu', controller.getCpuProfile);
router.get('/report', controller.getDiagnosticReport);
router.get('/memory', controller.getMemoryStats);

export const profilingRoutes = router;
