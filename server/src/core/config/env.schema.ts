import { z } from 'zod';

/**
 * Single Source of Truth for Environment Variables.
 * Uses strict validation to ensure Fail-Fast startup.
 */
export const EnvSchema = z.object({
  // --- Application ---
  APP_VERSION: z.string().default('1.0.0'),
  CONFIG_VERSION: z.coerce.number().min(1, 'CONFIG_VERSION must be at least 1').default(1),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),

  // --- Database & Cache ---
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  REDIS_URL: z.string().url().startsWith('redis://'),

  // --- Authentication ---
  JWT_ACCESS_SECRET: z.string().min(16, 'Access secret must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'Refresh secret must be at least 16 characters'),
  JWT_ACCESS_EXPIRES: z.string().regex(/^\d+[smhd]$/, "Must be in format like '15m', '1h', '7d'").default('15m'),
  JWT_REFRESH_EXPIRES: z.string().regex(/^\d+[smhd]$/).default('7d'),

  // --- Security ---
  PASSWORD_PEPPER: z.string().min(16, 'Password pepper must be secure and at least 16 characters'),
  CORS_ORIGIN: z.string().min(1, 'CORS Origin is required (use * for open)'),

  // --- Storage ---
  STORAGE_PROVIDER: z.enum(['LOCAL', 'S3', 'CLOUDFLARE_R2']).default('LOCAL'),
  STORAGE_ROOT_PATH: z.string().default('./storage'),

  // --- Mail ---
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  MAIL_FROM: z.string().email(),

  // --- Queue ---
  QUEUE_DRIVER: z.enum(['MEMORY', 'REDIS']).default('REDIS'),

  // --- AI (Google Gemini) ---
  // GEMINI_PROVIDER = 'api'   : Google official REST API (needs GEMINI_API_KEY)
  // GEMINI_PROVIDER = 'web2'  : local gemini-web2api proxy (gemini.google.com web, no key)
  GEMINI_PROVIDER: z.enum(['api', 'web2']).default('api'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  GEMINI_API_URL: z.string().url().default('https://generativelanguage.googleapis.com/v1beta'),

  // --- Logging & Monitoring ---
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  ENABLE_METRICS: z.coerce.boolean().default(false),
  ENABLE_PROFILING: z.coerce.boolean().default(false),
  DATABASE_SLOW_QUERY_MS: z.coerce.number().int().min(1).default(75),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

/**
 * List of keys that contain sensitive information.
 * Used by the Fingerprint Logger to mask secrets.
 */
export const SENSITIVE_KEYS: (keyof EnvConfig)[] = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'PASSWORD_PEPPER',
  'SMTP_PASSWORD',
  'GEMINI_API_KEY',
];
