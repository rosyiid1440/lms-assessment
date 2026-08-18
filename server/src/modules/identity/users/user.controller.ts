import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { IUserRepository } from './repositories/user.repository';
import { RequestContextService } from '../../../core/context/request-context.service';

export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userRepository: IUserRepository // Allowed here ONLY for read operations (CQRS pattern lite)
  ) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = RequestContextService.getContext();
      const result = await this.userService.createUser(req.body, ctx);
      
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: result,
        meta: { correlationId: ctx.correlationId }
      });
    } catch (error) {
      next(error);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = RequestContextService.getContext();
      const tenantId = ctx.identity?.tenantId!;
      
      const user = await this.userRepository.findById(req.params.id, tenantId);
      
      if (!user) {
        // We will throw ResourceNotFoundException in a real setup, handled by Global Error
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // ETag Implementation (Weak ETag based on updatedAt timestamp)
      const eTag = `W/"${new Date(user.updatedAt).getTime()}"`;
      res.setHeader('ETag', eTag);

      if (req.headers['if-none-match'] === eTag) {
        return res.status(304).end(); // Not Modified, saves bandwidth
      }

      res.status(200).json({
        success: true,
        message: 'User retrieved successfully',
        data: user,
        meta: { correlationId: ctx.correlationId }
      });
    } catch (error) {
      next(error);
    }
  };

  search = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = RequestContextService.getContext();
      const tenantId = ctx.identity?.tenantId!;
      
      // req.query is already validated and typed by Zod Middleware
      const { page, limit, sortBy, sortDir, ...filters } = req.query as any;

      const result = await this.userRepository.findMany(
        { ...filters, tenantId },
        { page, limit },
        { sortBy, sortDir }
      );

      res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data: result.data,
        meta: { ...result.meta, correlationId: ctx.correlationId }
      });
    } catch (error) {
      next(error);
    }
  };

  // --- Explicit REST Actions (State Machine) ---

  activate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = RequestContextService.getContext();
      await this.userService.activateUser(req.params.id, new Date(req.body.expectedUpdatedAt), ctx);
      
      res.status(200).json({
        success: true,
        message: 'User activated successfully',
        meta: { correlationId: ctx.correlationId }
      });
    } catch (error) {
      next(error);
    }
  };

  suspend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = RequestContextService.getContext();
      await this.userService.suspendUser(req.params.id, req.body.reason, new Date(req.body.expectedUpdatedAt), ctx);
      
      res.status(200).json({
        success: true,
        message: 'User suspended successfully',
        meta: { correlationId: ctx.correlationId }
      });
    } catch (error) {
      next(error);
    }
  };

  archive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = RequestContextService.getContext();
      await this.userService.archiveUser(req.params.id, req.body.reason, new Date(req.body.expectedUpdatedAt), ctx);
      
      res.status(200).json({
        success: true,
        message: 'User archived successfully',
        meta: { correlationId: ctx.correlationId }
      });
    } catch (error) {
      next(error);
    }
  };
}
