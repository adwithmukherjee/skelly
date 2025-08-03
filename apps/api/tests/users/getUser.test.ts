import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Application } from 'express';
import { Database } from '@skelly/db';
import { users } from '@skelly/db';
import { eq } from 'drizzle-orm';
import { initializeTestApplication } from '../utils';

describe('GET /users/:id', () => {
  let app: Application;
  let db: Database;

  beforeAll(async () => {
    const res = await initializeTestApplication();
    app = res.app;
    db = res.db;
  });

  beforeEach(async () => {
    // Clean up users table before each test
    await db.delete(users);
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  it('should retrieve a user by valid ID', async () => {
    // Create a test user first
    const [testUser] = await db.insert(users).values({
      email: 'getuser@example.com',
      username: 'Get User',
      passwordHash: 'hashed_password',
      firstName: 'Get',
      lastName: 'User',
      role: 'user',
      isEmailVerified: true,
      isActive: true,
    }).returning();

    const response = await request(app).get(`/users/${testUser.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        id: testUser.id,
        email: 'getuser@example.com',
        username: 'Get User',
        firstName: 'Get',
        lastName: 'User',
        role: 'user',
        isEmailVerified: true,
        isActive: true,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    });
  });

  it('should return 404 for non-existent user ID', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await request(app).get(`/users/${nonExistentId}`);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      error: {
        code: 'NOT_FOUND',
        message: expect.stringContaining('User'),
      },
    });
  });

  it('should return validation error for invalid UUID format', async () => {
    const invalidId = 'not-a-valid-uuid';

    const response = await request(app).get(`/users/${invalidId}`);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
      },
    });
  });

  it('should include request ID in response headers', async () => {
    const [testUser] = await db.insert(users).values({
      email: 'header@example.com',
      username: 'Header User',
      passwordHash: 'hashed_password',
      role: 'user',
    }).returning();

    const response = await request(app).get(`/users/${testUser.id}`);

    expect(response.headers['x-request-id']).toBeDefined();
    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('should retrieve user with minimal fields', async () => {
    const [testUser] = await db.insert(users).values({
      email: 'minimal@example.com',
      username: null,
      passwordHash: 'hashed_password',
      firstName: null,
      lastName: null,
      role: 'user',
    }).returning();

    const response = await request(app).get(`/users/${testUser.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: testUser.id,
      email: 'minimal@example.com',
      username: null,
      firstName: null,
      lastName: null,
      role: 'user',
      isEmailVerified: false,
      isActive: true,
      lastLoginAt: null,
    });
  });

  it('should retrieve admin user', async () => {
    const [adminUser] = await db.insert(users).values({
      email: 'admin@example.com',
      username: 'Admin User',
      passwordHash: 'hashed_password',
      role: 'admin',
      isEmailVerified: true,
      isActive: true,
    }).returning();

    const response = await request(app).get(`/users/${adminUser.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data.role).toBe('admin');
  });

  it('should handle database errors gracefully', async () => {
    // Create a valid user first
    const [testUser] = await db.insert(users).values({
      email: 'error@example.com',
      username: 'Error User',
      passwordHash: 'hashed_password',
      role: 'user',
    }).returning();

    // Mock a database error
    const originalSelect = db.select;
    db.select = () => {
      throw new Error('Database connection lost');
    };

    const response = await request(app).get(`/users/${testUser.id}`);

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      error: {
        message: expect.any(String),
      },
    });

    // Restore original function
    db.select = originalSelect;
  });
});