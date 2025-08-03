import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Application } from 'express';
import { Database } from '@skelly/db';
import { users } from '@skelly/db';
import { eq } from 'drizzle-orm';
import { initializeTestApplication } from '../utils';

describe('DELETE /users/:id', () => {
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

  it('should delete an existing user', async () => {
    // Create a test user
    const [testUser] = await db.insert(users).values({
      email: 'delete@example.com',
      username: 'Delete User',
      passwordHash: 'hashed_password',
      role: 'user',
    }).returning();

    const response = await request(app).delete(`/users/${testUser.id}`);

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});

    // Verify user is deleted from database
    const deletedUser = await db
      .select()
      .from(users)
      .where(eq(users.id, testUser.id));
    expect(deletedUser).toHaveLength(0);
  });

  it('should return 404 for non-existent user', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await request(app).delete(`/users/${nonExistentId}`);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      error: {
        code: 'NOT_FOUND',
        message: expect.stringContaining('User'),
      },
    });
  });

  it('should validate UUID parameter', async () => {
    const response = await request(app).delete('/users/not-a-uuid');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
      },
    });
  });

  it('should delete admin user', async () => {
    const [adminUser] = await db.insert(users).values({
      email: 'admin@example.com',
      username: 'Admin User',
      passwordHash: 'hashed_password',
      role: 'admin',
      isEmailVerified: true,
    }).returning();

    const response = await request(app).delete(`/users/${adminUser.id}`);

    expect(response.status).toBe(204);

    // Verify admin is deleted
    const deletedAdmin = await db
      .select()
      .from(users)
      .where(eq(users.id, adminUser.id));
    expect(deletedAdmin).toHaveLength(0);
  });

  it('should handle multiple deletes of the same user', async () => {
    const [testUser] = await db.insert(users).values({
      email: 'doubledelete@example.com',
      username: 'Double Delete',
      passwordHash: 'hashed_password',
      role: 'user',
    }).returning();

    // First delete should succeed
    const firstDelete = await request(app).delete(`/users/${testUser.id}`);
    expect(firstDelete.status).toBe(204);

    // Second delete should return 404
    const secondDelete = await request(app).delete(`/users/${testUser.id}`);
    expect(secondDelete.status).toBe(404);
    expect(secondDelete.body.error.code).toBe('NOT_FOUND');
  });

  it('should include request ID in response headers', async () => {
    const [testUser] = await db.insert(users).values({
      email: 'header@example.com',
      username: 'Header User',
      passwordHash: 'hashed_password',
      role: 'user',
    }).returning();

    const response = await request(app).delete(`/users/${testUser.id}`);

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
    const originalDelete = db.delete;
    db.delete = () => {
      throw new Error('Database connection lost');
    };

    const response = await request(app).delete(`/users/${testUser.id}`);

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      error: {
        message: expect.any(String),
      },
    });

    // Restore original function
    db.delete = originalDelete;
  });

  it('should verify user is completely removed', async () => {
    // Create user with all fields populated
    const [testUser] = await db.insert(users).values({
      email: 'complete@example.com',
      username: 'Complete User',
      passwordHash: 'hashed_password',
      firstName: 'Complete',
      lastName: 'User',
      role: 'admin',
      isEmailVerified: true,
      isActive: true,
      lastLoginAt: new Date(),
    }).returning();

    // Delete the user
    const response = await request(app).delete(`/users/${testUser.id}`);
    expect(response.status).toBe(204);

    // Verify all user data is removed
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, 'complete@example.com'));
    expect(result).toHaveLength(0);

    // Verify by ID as well
    const resultById = await db
      .select()
      .from(users)
      .where(eq(users.id, testUser.id));
    expect(resultById).toHaveLength(0);
  });

  it('should not affect other users when deleting one', async () => {
    // Create multiple users
    const [user1] = await db.insert(users).values({
      email: 'user1@example.com',
      username: 'User 1',
      passwordHash: 'hashed_password',
      role: 'user',
    }).returning();

    const [user2] = await db.insert(users).values({
      email: 'user2@example.com',
      username: 'User 2',
      passwordHash: 'hashed_password',
      role: 'user',
    }).returning();

    const [user3] = await db.insert(users).values({
      email: 'user3@example.com',
      username: 'User 3',
      passwordHash: 'hashed_password',
      role: 'user',
    }).returning();

    // Delete user2
    const response = await request(app).delete(`/users/${user2.id}`);
    expect(response.status).toBe(204);

    // Verify user1 and user3 still exist
    const remainingUsers = await db.select().from(users);
    expect(remainingUsers).toHaveLength(2);
    expect(remainingUsers.map(u => u.email)).toContain('user1@example.com');
    expect(remainingUsers.map(u => u.email)).toContain('user3@example.com');
    expect(remainingUsers.map(u => u.email)).not.toContain('user2@example.com');
  });
});