import { Router } from 'express';
import { UserController } from './user.controller';
import { validateRequest } from '../../../core/middleware/validation.middleware';
import { CreateUserSchema, UserFilterSchema } from './validators/user.validator';
import { z } from 'zod';

// Reusable schema for OCC actions
const OccActionSchema = z.object({
  expectedUpdatedAt: z.string().datetime(),
  reason: z.string().max(500).optional(),
});

export const createUserRoutes = (userController: UserController): Router => {
  const router = Router();

  // The mounting point in app.ts will be '/api/v1/users'

  // READ Operations
  router.get('/', validateRequest({ query: UserFilterSchema }), userController.search);
  router.get('/:id', userController.findById);

  // WRITE Operations
  router.post('/', validateRequest({ body: CreateUserSchema }), userController.create);

  // EXPLICIT STATE MACHINE ACTIONS
  router.post('/:id/activate', validateRequest({ body: OccActionSchema }), userController.activate);
  router.post('/:id/suspend', validateRequest({ body: OccActionSchema }), userController.suspend);
  router.post('/:id/archive', validateRequest({ body: OccActionSchema }), userController.archive);

  // PASSWORD MANAGEMENT
  // router.post('/:id/password', ...);

  return router;
};
