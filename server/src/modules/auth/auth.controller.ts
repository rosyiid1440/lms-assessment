import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { CookieUtil } from '../../shared/utils/cookie.util';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { AuthenticationRequiredException } from '../../core/exceptions/security.exception';

const LoginDTOSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  tenantId: z.string().uuid()
});

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService
  ) {}

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = LoginDTOSchema.parse(req.body);
      
      const reqContext = {
        correlationId: (req.headers['x-correlation-id'] as string) || uuidv4(),
        requestId: uuidv4(),
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'Unknown'
      };

      const deviceData = {
        deviceId: (req.headers['x-device-id'] as string) || 'unknown-device',
        deviceName: 'Web Browser', // normally parsed from user-agent
        platform: 'Web',
        browser: 'Chrome',
        os: 'Windows',
        ipAddress: reqContext.ipAddress
      };

      const result = await this.authService.login(
        data.email, 
        data.password, 
        data.tenantId, 
        deviceData, 
        reqContext
      );

      // HTTP Boundaries: Set Cookies
      CookieUtil.setAccessCookie(res, result.accessToken);
      CookieUtil.setRefreshCookie(res, result.refreshToken, 7 * 24 * 60 * 60 * 1000);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          session: result.session
        },
        meta: { correlationId: reqContext.correlationId },
        errors: null
      });
    } catch (error: any) {
      // In real app, pass to global error handler middleware
      next(error); 
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Expecting refreshToken from secure HTTPOnly cookie
      const oldToken = req.cookies.refreshToken;
      if (!oldToken) {
        throw new AuthenticationRequiredException('UNAUTHORIZED'); // Custom Error
      }

      const reqContext = {
        correlationId: (req.headers['x-correlation-id'] as string) || uuidv4(),
        requestId: uuidv4()
      };

      const result = await this.authService.rotateRefreshToken(oldToken, reqContext);

      CookieUtil.setAccessCookie(res, result.accessToken);
      CookieUtil.setRefreshCookie(res, result.refreshToken, 7 * 24 * 60 * 60 * 1000);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: null,
        meta: { correlationId: reqContext.correlationId },
        errors: null
      });
    } catch (error) {
      // If token reuse detected or invalid, clear cookies to force logout UX
      CookieUtil.clearCookies(res);
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // req.user is injected by Auth Guard Middleware
      const sessionId = req.user?.sessionId;
      const userId = req.user?.userId;
      const tenantId = req.user?.tenantId;

      if (sessionId && userId) {
        const reqContext = {
          correlationId: (req.headers['x-correlation-id'] as string) || uuidv4(),
          requestId: uuidv4()
        };
        await this.sessionService.revokeSession(sessionId, userId, tenantId, reqContext);
      }

      CookieUtil.clearCookies(res);

      res.status(200).json({
        success: true,
        message: 'Logout successful',
        data: null,
        meta: null,
        errors: null
      });
    } catch (error) {
      next(error);
    }
  };
}
