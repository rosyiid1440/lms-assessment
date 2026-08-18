import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('\n🚀 Starting Phase 1.5: Infrastructure & Schema Physical Verification...\n');

  try {
    // 1. Verify Enum Creation
    console.log('🔍 Checking PostgreSQL Enums...');
    const enums = await prisma.$queryRaw<{ typname: string }[]>`
      SELECT typname FROM pg_type WHERE typtype = 'e';
    `;
    const enumNames = enums.map(e => e.typname);
    console.log(`✅ Found ${enums.length} physical enums (e.g., ${enumNames.slice(0, 3).join(', ')}...)`);

    // 2. Verify Tables
    console.log('\n🔍 Checking Physical Tables...');
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public';
    `;
    console.log(`✅ Found ${tables.length} physical tables.`);

    // 3. Verify Constraints & Foreign Keys
    console.log('\n🔍 Checking Foreign Keys & Constraints...');
    const fks = await prisma.$queryRaw<{ conname: string }[]>`
      SELECT conname FROM pg_constraint WHERE contype = 'f';
    `;
    console.log(`✅ Found ${fks.length} physical foreign keys protecting data integrity.`);

    // 4. Smoke Test: Perform basic operations
    console.log('\n💨 Running Smoke Test...');
    
    // Create Tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: 'SMA N 1 Smoke Test',
        code: 'sman1-test',
        status: 'ACTIVE'
      }
    });
    console.log(`✅ Tenant Created: ${tenant.id}`);

    // Create Role
    const role = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'Administrator',
        slug: 'admin',
        isSystem: true
      }
    });
    console.log(`✅ Role Created: ${role.id}`);

    // Create User
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'admin@sman1-test.sch.id',
        passwordHash: 'hashed_password_mock',
        status: 'ACTIVE',
        roleId: role.id
      }
    });
    console.log(`✅ User Created: ${user.id}`);

    // Clean up Smoke Test Data
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.role.delete({ where: { id: role.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
    console.log('🧹 Smoke Test data cleaned up successfully.');

    console.log('\n🎉 ALL INFRASTRUCTURE VERIFICATIONS PASSED.\n');

  } catch (error) {
    console.error('❌ Verification Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
