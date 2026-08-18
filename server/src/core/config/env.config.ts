import { z } from 'zod';

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),

  // Security
  PASSWORD_PEPPER: z.string().min(10, 'PASSWORD_PEPPER is required and must be long'),
  
  // JWT
  JWT_ACCESS_SECRET: z.string().min(10, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(10, 'JWT_REFRESH_SECRET is required'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  JWT_REFRESH_REMEMBER_EXPIRES: z.string().default('30d'),

  // Rate Limiting
  MAX_LOGIN_ATTEMPT: z.coerce.number().default(5),
  LOCKOUT_DURATION_MS: z.coerce.number().default(900000),

  // Cookies Config
  COOKIE_NAME_ACCESS: z.string().default('accessToken'),
  COOKIE_NAME_REFRESH: z.string().default('refreshToken'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_PATH_REFRESH: z.string().default('/api/v1/auth/refresh'),
  COOKIE_SECURE: z.coerce.boolean().default(false), // Override via string in env, e.g. "true"
  COOKIE_HTTP_ONLY: z.coerce.boolean().default(true),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
});

// Parse process.env. If it fails, Zod will throw an error and prevent startup (Fail-Fast).
export const ENV = envSchema.parse(process.env);
