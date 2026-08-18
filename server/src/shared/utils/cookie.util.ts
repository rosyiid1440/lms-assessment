import { Response, CookieOptions } from 'express';
import { env } from '../../core/config/env';

export const CookieUtil = {
  getBaseOptions(maxAgeMs?: number): CookieOptions {
    return {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      ...(maxAgeMs ? { maxAge: maxAgeMs } : {})
    };
  },

  setAccessCookie(res: Response, token: string) {
    res.cookie('accessToken', token, this.getBaseOptions(15 * 60 * 1000));
  },

  setRefreshCookie(res: Response, token: string, maxAgeMs: number) {
    res.cookie('refreshToken', token, {
      ...this.getBaseOptions(maxAgeMs),
      path: '/api/auth/refresh',
    });
  },

  clearCookies(res: Response) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
  }
};
