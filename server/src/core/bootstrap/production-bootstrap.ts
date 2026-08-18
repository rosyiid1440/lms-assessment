import { env } from '../config/env';
import { Pool } from 'pg';
import { execSync } from 'child_process';

const MIGRATION_LOCK_ID = 88888888; // Arbitrary unique integer for Postgres Advisory Lock

async function runProductionBootstrap() {
  console.log('[BOOTSTRAP] Initiating Production Bootstrap Sequence...\n');

  // 1. Validasi Environment (Sudah otomatis dilakukan saat import { env } di atas)
  console.log(`[BOOTSTRAP] 1/5 Environment Validated. Config Version: ${env.CONFIG_VERSION}`);

  const pool = new Pool({ connectionString: env.DATABASE_URL });

  try {
    // 2. Cek Koneksi Database
    await pool.query('SELECT 1');
    console.log('[BOOTSTRAP] 2/5 PostgreSQL Connection Established.');

    // 3. Migration Lock (Prevent Concurrent Migrations across multiple container instances)
    const client = await pool.connect();
    try {
      const lockResult = await client.query(`SELECT pg_try_advisory_lock(${MIGRATION_LOCK_ID}) as locked`);
      const isLockedByMe = lockResult.rows[0].locked;

      if (!isLockedByMe) {
        console.log('[BOOTSTRAP] 3/5 Migration lock held by another instance. Skipping migration phase...');
        // We could loop and wait for the lock to be released, but for a simple aaPanel deployment, 
        // skipping is safe assuming the other container is handling it.
      } else {
        console.log('[BOOTSTRAP] 3/5 Acquired Migration Lock.');
        
        // 4. Jalankan Prisma Migrate Deploy
        console.log('[BOOTSTRAP] 4/5 Executing Database Migrations...');
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
        
        // Lepas lock setelah sukses
        await client.query(`SELECT pg_advisory_unlock(${MIGRATION_LOCK_ID})`);
        console.log('[BOOTSTRAP] 4/5 Migrations completed and Lock released.');
      }
    } finally {
      client.release();
    }

    // 5. Verifikasi Keutuhan Migration
    const migrationCheck = await pool.query(`SELECT COUNT(*) as count FROM _prisma_migrations WHERE "finished_at" IS NOT NULL`);
    console.log(`[BOOTSTRAP] 5/5 Database Verified. Applied Migrations: ${migrationCheck.rows[0].count}`);

    console.log('\n[BOOTSTRAP] SUCCESS. Handing over control to the Application Server...\n');
    
    // Disconnect Pool before handing over to Prisma Client in the main app
    await pool.end();

    // 6. Jalankan Aplikasi Utama
    // Memanggil server API utama untuk melakukan Bind ke port.
    // require('../../server'); // File entry point aplikasi (misal server.ts / app.ts)

  } catch (error: any) {
    console.error('\n❌ [BOOTSTRAP] FATAL ERROR DURING PRODUCTION BOOTSTRAP:');
    console.error(error.message || error);
    process.exit(1); // Fail the container startup
  }
}

runProductionBootstrap();
