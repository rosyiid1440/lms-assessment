import express from 'express';
import cookieParser from 'cookie-parser';
import prisma from './db-reset';

// Domains & Layers
import { PrismaAuthRepository } from '../../server/src/modules/auth/prisma-auth.repository';
import { AuthService } from '../../server/src/modules/auth/auth.service';
import { SessionService } from '../../server/src/modules/auth/session.service';
import { AuthController } from '../../server/src/modules/auth/auth.controller';
import { createAuthRoutes } from '../../server/src/modules/auth/auth.routes';
import { GlobalErrorMiddleware } from '../../server/src/core/middleware/error.middleware';
import { CorrelationIdMiddleware } from '../../server/src/core/middleware/correlation.middleware';

/**
 * Mocks the Event Publisher for isolated E2E tests.
 * We can inspect this mock to verify Domain Events are emitted.
 */
export const mockEventPublisher = {
  publish: (event: any) => {
    // console.log(`[TEST EVENT EMITTED] ${event.eventName}`);
  }
};

/**
 * Assembles the real Express App with Real Dependencies (except EventBus).
 */
export function buildTestApp() {
  const app = express();
  
  // Basic Middlewares
  app.use(express.json());
  app.use(cookieParser());
  app.use(CorrelationIdMiddleware);

  // Dependency Injection Assembly
  const authRepo = new PrismaAuthRepository(prisma);
  
  // Mock SuperAdmin Strategy
  const superAdminStrategy = { isSuperAdmin: async () => false };
  
  const authService = new AuthService(authRepo, mockEventPublisher as any);
  const sessionService = new SessionService(authRepo, mockEventPublisher as any);
  
  const authController = new AuthController(authService, sessionService);
  const authRoutes = createAuthRoutes(authController);

  // Mount Routes
  app.use('/api/v1/auth', authRoutes);

  // Global Error Handler (Translates to RFC 7807)
  app.use(GlobalErrorMiddleware);

  return app;
}
