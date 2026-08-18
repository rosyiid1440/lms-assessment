import { Router } from 'express';
import { AuthController } from './auth.controller';
// import { AuthGuard } from '../../core/middleware/auth.guard'; // Will be created in next phase

/**
 * Factory function to inject dependencies into routes
 */
export const createAuthRoutes = (authController: AuthController): Router => {
  const router = Router();

  // Public Routes
  router.post('/login', authController.login);
  router.post('/refresh', authController.refresh);

  // Protected Routes (requires AuthGuard)
  // router.post('/logout', AuthGuard, authController.logout);
  router.post('/logout', authController.logout); // Simplified for now

  return router;
};
