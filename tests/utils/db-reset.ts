import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Sweeps the database clean.
 * Used in `beforeEach` or `beforeAll` hooks to guarantee test isolation.
 * Uses TRUNCATE CASCADE to safely wipe relational data without dropping schema.
 */
export async function resetDatabase() {
  const tableNames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('_prisma_migrations');`;

  for (const { tablename } of tableNames) {
    if (tablename !== '_prisma_migrations') {
      try {
        await prisma.$executeRawUnsafe(
          `TRUNCATE TABLE "public"."${tablename}" CASCADE;`
        );
      } catch (error) {
        console.log({ error });
      }
    }
  }
}

/**
 * Ensures Prisma disconnects properly after all tests.
 */
export async function disconnectDatabase() {
  await prisma.$disconnect();
}

export default prisma;
