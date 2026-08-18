export async function seedTenants(prisma) {
    console.log('🌱 Seeding Tenants...');
    await prisma.tenant.upsert({
        where: { code: 'default-tenant' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000000', // Deterministic ID for easy reference
            name: 'SMA Negeri 1 Enterprise',
            code: 'default-tenant',
            status: 'ACTIVE',
            timezone: 'Asia/Jakarta',
            locale: 'id-ID'
        }
    });
}
