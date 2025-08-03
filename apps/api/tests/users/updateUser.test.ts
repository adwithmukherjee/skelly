import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Application } from 'express';
import { Database } from '@skelly/db';
import { users } from '@skelly/db';
import { eq } from 'drizzle-orm';
import { initializeTestApplication } from '../utils';

describe('PATCH /users/:id', () => {
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

  it('should update user email', async () => {
    // Create a test user
    const [testUser] = await db.insert(users).values({
      email: 'original@example.com',
      username: 'Test User',
      passwordHash: 'hashed_password',
      role: 'user',
    }).returning();

    const updateData = {
      email: 'updated@example.com',
    };

    const response = await request(app)
      .patch(`/users/${testUser.id}`)
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        id: testUser.id,
        email: 'updated@example.com',
        username: 'Test User',
        role: 'user',
      },
    });

    // Verify in database
    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, testUser.id));
    expect(updatedUser.email).toBe('updated@example.com');
  });

  it('should update user name', async () => {
    const [testUser] = await db.insert(users).values({
      email: 'nameupdate@example.com',
      username: 'Original Name',
      passwordHash: 'hashed_password',
      role: 'user',
    }).returning();

    const updateData = {
      name: 'Updated Name',
    };

    const response = await request(app)
      .patch(`/users/${testUser.id}`)
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body.data.username).toBe('Updated Name');
  });

  it('should update user role', async () => {
    const [testUser] = await db.insert(users).values({
      email: 'roleupdate@example.com',
      username: 'Role User',
      passwordHash: 'hashed_password',
      role: 'user',
    }).returning();

    const updateData = {
      role: 'admin',
    };

    const response = await request(app)
      .patch(`/users/${testUser.id}`)
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body.data.role).toBe('admin');
  });

  it('should update multiple fields at once', async () => {
    const [testUser] = await db.insert(users).values({
      email: 'multiple@example.com',
      username: 'Original Name',
      passwordHash: 'hashed_password',
      role: 'user',
    }).returning();

    const updateData = {
      email: 'newmultiple@example.com',
      name: 'New Name',
      role: 'admin',
    };

    const response = await request(app)
      .patch(`/users/${testUser.id}`)
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      email: 'newmultiple@example.com',
      username: 'New Name',
      role: 'admin',
    });
  });

  it('should return 404 for non-existent user', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await request(app)
      .patch(`/users/${nonExistentId}`)
      .send({ name: 'New Name' });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      error: {
        code: 'NOT_FOUND',
        message: expect.stringContaining('User'),
      },
    });
  });

  it('should return validation error for invalid email format', async () => {
    const [testUser] = await db.insert(users).values({
      email: 'valid@example.com',
      username: 'Test User',
      passwordHash: 'hashed_password',
      role: 'user',
    }).returning();

    const response = await request(app)
      .patch(`/users/${testUser.id}`)
      .send({ email: 'invalid-email' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
      },
    });
  });

  it('should return validation error for empty name', async () => {
    const [testUser] = await db.insert(users).values({
      email: 'emptyname@example.com',
      username: 'Test User',
      passwordHash: 'hashed_password',
      role: 'user',
    }).returning();

    const response = await request(app)
      .patch(`/users/${testUser.id}`)
      .send({ name: '' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return validation error for name exceeding max length', async () => {
    const [testUser] = await db.insert(users).values({
      email: 'longname@example.com',
      username: 'Test User',
      passwordHash: 'hashed_password',
      role: 'user',
    }).returning();

    const response = await request(app)
      .patch(`/users/${testUser.id}`)
      .send({ name: 'a'.repeat(101) });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return validation error for invalid role', async () => {
    const [testUser] = await db.insert(users).values({
      email: 'invalidrole@example.com',
      username: 'Test User',
      passwordHash: 'hashed_password',
      role: 'user',
    }).returning();

    const response = await request(app)
      .patch(`/users/${testUser.id}`)
      .send({ role: 'superadmin' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return conflict error when email already exists', async () => {
    // Create two users
    const [user1] = await db.insert(users).values({
      email: 'user1@example.com',
      username: 'User 1',
      passwordHash: 'hashed_password',
      role: 'user',
    }).returning();

    await db.insert(users).values({
      email: 'user2@example.com',
      username: 'User 2',
      passwordHash: 'hashed_password',
      role: 'user',
    });

    // Try to update user1's email to user2's email
    const response = await request(app)
      .patch(`/users/${user1.id}`)
      .send({ email: 'user2@example.com' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email already in use',
      },
    });
  });

  it('should allow updating to the same email', async () => {
    const [testUser] = await db.insert(users).values({
      email: 'same@example.com',
      username: 'Test User',
      passwordHash: 'hashed_password',
      role: 'user',
    }).returning();

    // Update with the same email
    const response = await request(app)
      .patch(`/users/${testUser.id}`)
      .send({ 
        email: 'same@example.com',
        name: 'Updated Name',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe('same@example.com');
    expect(response.body.data.username).toBe('Updated Name');
  });

  it('should handle empty update body', async () => {
    const [testUser] = await db.insert(users).values({
      email: 'empty@example.com',
      username: 'Test User',
      passwordHash: 'hashed_password',
      role: 'user',
    }).returning();

    const response = await request(app)
      .patch(`/users/${testUser.id}`)
      .send({});

    // Should succeed but not change anything
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      email: 'empty@example.com',
      username: 'Test User',
      role: 'user',
    });
  });

  it('should validate UUID parameter', async () => {
    const response = await request(app)
      .patch('/users/not-a-uuid')
      .send({ name: 'New Name' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should include request ID in response headers', async () => {
    const [testUser] = await db.insert(users).values({
      email: 'header@example.com',
      username: 'Header User',
      passwordHash: 'hashed_password',
      role: 'user',
    }).returning();

    const response = await request(app)
      .patch(`/users/${testUser.id}`)
      .send({ name: 'Updated' });

    expect(response.headers['x-request-id']).toBeDefined();
    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('should handle database errors gracefully', async () => {
    const [testUser] = await db.insert(users).values({
      email: 'error@example.com',
      username: 'Error User',
      passwordHash: 'hashed_password',
      role: 'user',
    }).returning();

    // Mock a database error
    const originalUpdate = db.update;
    db.update = () => {
      throw new Error('Database connection lost');
    };

    const response = await request(app)
      .patch(`/users/${testUser.id}`)
      .send({ name: 'New Name' });

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      error: {
        message: expect.any(String),
      },
    });

    // Restore original function
    db.update = originalUpdate;
  });
});