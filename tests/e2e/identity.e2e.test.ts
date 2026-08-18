import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp } from '../utils/test-app';
import prisma, { resetDatabase, disconnectDatabase } from '../utils/db-reset';
import { FixtureFactory } from '../factories/fixture.factory';

describe('Identity E2E Tests', () => {
  const app = buildTestApp();
  let tenantId: string;
  let roleId: string;
  let validUser: any;

  beforeEach(async () => {
    // Seed real DB dependencies
    const tenant = await FixtureFactory.createTenant();
    const role = await FixtureFactory.createRole(tenant.id);
    tenantId = tenant.id;
    roleId = role.id;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  // ---------------------------------------------------------
  // 1. AUTHENTICATION FLOWS
  // ---------------------------------------------------------
  describe('POST /api/v1/auth/login', () => {
    it('should return 400 for malformed payload (Zod Validation)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email' }); // Missing password & tenantId

      if (response.status === 500) {
         console.error('500 ERROR BODY:', response.body);
      }

      expect(response.status).toBe(400);
      expect(response.body.title).toBe('Validation Failed');
      if (!response.body.errors) {
        console.log('BODY:', response.body);
      }
      expect(response.body.errors).toBeDefined();
    });

    it('should return 401 Invalid Credentials for unknown email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'ghost@test.com', password: 'Password123!', tenantId: tenantId });

      expect(response.status).toBe(401);
      expect(response.body.detail).toMatch(/INVALID_CREDENTIALS/); 
    });
  });

  // ---------------------------------------------------------
  // 2. REFRESH TOKEN FLOWS
  // ---------------------------------------------------------
  describe('POST /api/v1/auth/refresh', () => {
    it('should reject requests without HttpOnly refreshToken cookie', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send();

      expect(response.status).toBe(401);
      expect(response.body.type).toContain('AUTH_001'); // AUTH_REQUIRED code
    });
  });
});
