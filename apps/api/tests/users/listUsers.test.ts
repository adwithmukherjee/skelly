import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Application } from 'express';
import { Database } from '@skelly/db';
import { users } from '@skelly/db';
import { initializeTestApplication } from '../utils';

describe('GET /users', () => {
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

  it('should list all users with default pagination', async () => {
    // Create test users
    await db.insert(users).values([
      {
        email: 'user1@example.com',
        username: 'User 1',
        passwordHash: 'hashed_password',
        role: 'user',
      },
      {
        email: 'user2@example.com',
        username: 'User 2',
        passwordHash: 'hashed_password',
        role: 'admin',
      },
      {
        email: 'user3@example.com',
        username: 'User 3',
        passwordHash: 'hashed_password',
        role: 'user',
      },
    ]);

    const response = await request(app).get('/users');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: expect.arrayContaining([
        expect.objectContaining({ email: 'user1@example.com' }),
        expect.objectContaining({ email: 'user2@example.com' }),
        expect.objectContaining({ email: 'user3@example.com' }),
      ]),
      pagination: {
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
  });

  it('should paginate users correctly', async () => {
    // Create 5 test users
    const testUsers = Array.from({ length: 5 }, (_, i) => ({
      email: `user${i + 1}@example.com`,
      username: `User ${i + 1}`,
      passwordHash: 'hashed_password',
      role: 'user' as const,
    }));
    await db.insert(users).values(testUsers);

    // Get first page with limit 2
    const page1 = await request(app).get('/users?page=1&limit=2');
    expect(page1.status).toBe(200);
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.pagination).toMatchObject({
      page: 1,
      limit: 2,
      total: 5,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: false,
    });

    // Get second page
    const page2 = await request(app).get('/users?page=2&limit=2');
    expect(page2.status).toBe(200);
    expect(page2.body.data).toHaveLength(2);
    expect(page2.body.pagination.page).toBe(2);

    // Get third page
    const page3 = await request(app).get('/users?page=3&limit=2');
    expect(page3.status).toBe(200);
    expect(page3.body.data).toHaveLength(1);
    expect(page3.body.pagination.page).toBe(3);
  });

  it('should filter users by role', async () => {
    // Create mixed role users
    await db.insert(users).values([
      {
        email: 'admin1@example.com',
        username: 'Admin 1',
        passwordHash: 'hashed_password',
        role: 'admin',
      },
      {
        email: 'user1@example.com',
        username: 'User 1',
        passwordHash: 'hashed_password',
        role: 'user',
      },
      {
        email: 'admin2@example.com',
        username: 'Admin 2',
        passwordHash: 'hashed_password',
        role: 'admin',
      },
      {
        email: 'user2@example.com',
        username: 'User 2',
        passwordHash: 'hashed_password',
        role: 'user',
      },
    ]);

    // Get only admins
    const adminsResponse = await request(app).get('/users?role=admin');
    expect(adminsResponse.status).toBe(200);
    expect(adminsResponse.body.data).toHaveLength(2);
    expect(adminsResponse.body.data.every((u: any) => u.role === 'admin')).toBe(
      true
    );
    expect(adminsResponse.body.pagination.total).toBe(2);

    // Get only users
    const usersResponse = await request(app).get('/users?role=user');
    expect(usersResponse.status).toBe(200);
    expect(usersResponse.body.data).toHaveLength(2);
    expect(usersResponse.body.data.every((u: any) => u.role === 'user')).toBe(
      true
    );
    expect(usersResponse.body.pagination.total).toBe(2);
  });

  it('should return empty list when no users exist', async () => {
    const response = await request(app).get('/users');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
  });

  it('should validate pagination parameters', async () => {
    // Invalid page (less than 1)
    const invalidPage = await request(app).get('/users?page=0');
    expect(invalidPage.status).toBe(400);
    expect(invalidPage.body.error.code).toBe('VALIDATION_ERROR');

    // Invalid limit (greater than 100)
    const invalidLimit = await request(app).get('/users?limit=101');
    expect(invalidLimit.status).toBe(400);
    expect(invalidLimit.body.error.code).toBe('VALIDATION_ERROR');

    // Invalid limit (less than 1)
    const invalidLimitLow = await request(app).get('/users?limit=0');
    expect(invalidLimitLow.status).toBe(400);
    expect(invalidLimitLow.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should validate role parameter', async () => {
    const response = await request(app).get('/users?role=superadmin');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
      },
    });
  });

  it('should handle large page numbers gracefully', async () => {
    // Create only 2 users
    await db.insert(users).values([
      {
        email: 'user1@example.com',
        username: 'User 1',
        passwordHash: 'hashed_password',
        role: 'user',
      },
      {
        email: 'user2@example.com',
        username: 'User 2',
        passwordHash: 'hashed_password',
        role: 'user',
      },
    ]);

    // Request page 100
    const response = await request(app).get('/users?page=100&limit=10');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: [],
      pagination: {
        page: 100,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: true,
      },
    });
  });

  it('should include request ID in response headers', async () => {
    const response = await request(app).get('/users');

    expect(response.headers['x-request-id']).toBeDefined();
    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('should handle database errors gracefully', async () => {
    // Mock a database error
    const originalSelect = db.select;
    db.select = () => {
      throw new Error('Database connection lost');
    };

    const response = await request(app).get('/users');

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      error: {
        message: expect.any(String),
      },
    });

    // Restore original function
    db.select = originalSelect;
  });

  it('should return users ordered consistently', async () => {
    // Create users with specific timestamps
    await db
      .insert(users)
      .values({
        email: 'first@example.com',
        username: 'First User',
        passwordHash: 'hashed_password',
        role: 'user',
      })
      .returning();

    // Wait a bit to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));

    await db
      .insert(users)
      .values({
        email: 'second@example.com',
        username: 'Second User',
        passwordHash: 'hashed_password',
        role: 'user',
      })
      .returning();

    const response = await request(app).get('/users');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    // Users should be returned in a consistent order (likely by createdAt or id)
    expect(response.body.data[0].email).toBe('first@example.com');
    expect(response.body.data[1].email).toBe('second@example.com');
  });
});
