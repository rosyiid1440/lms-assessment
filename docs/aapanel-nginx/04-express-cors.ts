/**
 * ==================================================================
 * PHASE D.10 - CORS CONFIGURATION (EXPRESS / NODE.JS)
 * ==================================================================
 * Mengkonfigurasi CORS di Nginx secara dinamis dari `.env` sangat sulit dan rentan error
 * jika menggunakan origin berganda. Praktik terbaik (Best Practice) adalah membiarkan
 * Nginx meneruskan request, lalu Express.js yang melakukan Filter CORS berdasarkan `.env`.
 * 
 * Tambahkan ini di `server/src/core/bootstrap/app.ts` atau `test-app.ts` Anda:
 */

import cors from 'cors';
import { env } from '../config/env';

export const configureCors = (app: any) => {
  // Mendukung multi-origin jika ENV dipisah koma (e.g. "https://lms.sch.id,https://admin.lms.sch.id")
  const allowedOrigins = env.CORS_ORIGIN.split(',').map(url => url.trim());

  app.use(cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Izinkan request tanpa origin (seperti S2S API call atau curl) atau jika origin ada di whitelist
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // WAJIB TRUE untuk membaca HttpOnly Cookie (Refresh Token)
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With', 
      'X-Correlation-ID', 
      'X-Device-ID'
    ],
    maxAge: 86400, // Cache preflight (OPTIONS) request selama 24 jam untuk hemat latency
  }));
};
