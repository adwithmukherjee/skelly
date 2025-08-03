import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Application } from 'express';
import { Database, testDbClient } from '@skelly/db';
import { users } from '@skelly/db';
import { eq } from 'drizzle-orm';
import { initializeTestApplication } from '../utils';

describe('POST /users', () => {
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
    await testDbClient.close();
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  it('should create a new user with valid data', async () => {
    const newUser = {
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    };

    const response = await request(app).post('/users').send(newUser);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        id: expect.any(String),
        email: 'test@example.com',
        username: 'Test User',
        role: 'user',
        isEmailVerified: false,
        isActive: true,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    });

    // Verify user was created in database
    const [createdUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'test@example.com'));

    expect(createdUser).toBeDefined();
    expect(createdUser.email).toBe('test@example.com');
    expect(createdUser.username).toBe('Test User');
  });

  it('should create an admin user when role is specified', async () => {
    const newAdmin = {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
    };

    const response = await request(app).post('/users').send(newAdmin);

    expect(response.status).toBe(200);
    expect(response.body.data.role).toBe('admin');
  });

  it('should default to user role when not specified', async () => {
    const newUser = {
      email: 'default@example.com',
      name: 'Default User',
    };

    const response = await request(app).post('/users').send(newUser);

    expect(response.status).toBe(200);
    expect(response.body.data.role).toBe('user');
  });

  it('should return validation error for invalid email', async () => {
    const invalidUser = {
      email: 'invalid-email',
      name: 'Test User',
    };

    const response = await request(app).post('/users').send(invalidUser);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
      },
    });
  });

  it('should return validation error for missing required fields', async () => {
    const incompleteUser = {
      email: 'test@example.com',
      // missing name
    };

    const response = await request(app).post('/users').send(incompleteUser);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
      },
    });
  });

  it('should return validation error for empty name', async () => {
    const userWithEmptyName = {
      email: 'test@example.com',
      name: '',
    };

    const response = await request(app).post('/users').send(userWithEmptyName);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
      },
    });
  });

  it('should return validation error for name exceeding max length', async () => {
    const userWithLongName = {
      email: 'test@example.com',
      name: 'a'.repeat(101), // 101 characters, exceeds max of 100
    };

    const response = await request(app).post('/users').send(userWithLongName);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
      },
    });
  });

  it('should return validation error for invalid role', async () => {
    const userWithInvalidRole = {
      email: 'test@example.com',
      name: 'Test User',
      role: 'superadmin', // not a valid role
    };

    const response = await request(app)
      .post('/users')
      .send(userWithInvalidRole);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
      },
    });
  });

  it('should return conflict error when email already exists', async () => {
    const existingUser = {
      email: 'existing@example.com',
      name: 'Existing User',
    };

    // Create first user
    await request(app).post('/users').send(existingUser);

    // Try to create user with same email
    const duplicateUser = {
      email: 'existing@example.com',
      name: 'Another User',
    };

    const response = await request(app).post('/users').send(duplicateUser);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email already in use',
      },
    });
  });

  it('should handle database errors gracefully', async () => {
    // Mock a database error by temporarily breaking the service
    const originalCreate = db.insert;
    db.insert = () => {
      throw new Error('Database connection lost');
    };

    const newUser = {
      email: 'test@example.com',
      name: 'Test User',
    };

    const response = await request(app).post('/users').send(newUser);

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      error: {
        message: expect.any(String),
      },
    });

    // Restore original function
    db.insert = originalCreate;
  });

  it('should include request ID in response headers', async () => {
    const newUser = {
      email: 'test@example.com',
      name: 'Test User',
    };

    const response = await request(app).post('/users').send(newUser);

    expect(response.headers['x-request-id']).toBeDefined();
    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('should accept valid user data with all fields', async () => {
    const completeUser = {
      email: 'complete@example.com',
      name: 'Complete User',
      role: 'admin',
    };

    const response = await request(app).post('/users').send(completeUser);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        email: 'complete@example.com',
        username: 'Complete User',
        role: 'admin',
        firstName: null,
        lastName: null,
        isEmailVerified: false,
        isActive: true,
        lastLoginAt: null,
      },
    });
  });
});
