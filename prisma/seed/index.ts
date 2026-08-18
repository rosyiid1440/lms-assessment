import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

// Import seeders
import { seedTenants } from './01-tenants';
import { seedRolesAndPermissions } from './02-roles';
import { seedAdmin } from './03-admin';
import { seedAcademicMaster } from './04-academic-master';
import { seedStudents } from './05-students';
import { seedTeachers } from './06-teachers';
import { seedEnrollmentsVariations } from './07-enrollments';
import { seedCourses } from './08-courses';
import { seedLearning } from './09-learning';
import { seedStudy } from './10-study';
import { seedAssessment } from './11-assessment';

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
    await seedAdmin(prisma);
    await seedAcademicMaster(prisma);
    await seedStudents(prisma);
    await seedTeachers(prisma);
    await seedEnrollmentsVariations(prisma);
    await seedCourses(prisma);
    await seedLearning(prisma);
    await seedStudy(prisma);
    await seedAssessment(prisma);
    
    console.log('\n✅ ALL SEEDS COMPLETED SUCCESSFULLY.\n');
  } catch (error) {
    console.error('❌ SEEDING FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
