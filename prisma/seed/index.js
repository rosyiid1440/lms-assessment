import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
// Import seeders
import { seedTenants } from './01-tenants';
import { seedRolesAndPermissions } from './02-roles';
dotenv.config();
// Prisma 7 Adapter setup
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
async function main() {
    console.log('\n🌟 STARTING MASTER DATA SEEDING 🌟\n');
    try {
        await seedTenants(prisma);
        await seedRolesAndPermissions(prisma);
        // Future seeds:
        // await seedAdmin(prisma);
        // await seedAcademic(prisma);
        // await seedSubjects(prisma);
        console.log('\n✅ ALL SEEDS COMPLETED SUCCESSFULLY.\n');
    }
    catch (error) {
        console.error('❌ SEEDING FAILED:', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
        await pool.end();
    }
}
main();
