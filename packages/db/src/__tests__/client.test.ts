import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest';
import {
  createDatabaseClient,
  closeDatabaseConnection,
  checkDatabaseConnection,
} from '../client';
import { users } from '../schema/user/users';
import { eq } from 'drizzle-orm';
import {
  createTestDatabase,
  cleanupTestDatabase,
  runMigrations,
  TestDatabase,
} from './test-utils';
import { logger } from '@skelly/utils';

describe('Database Client', () => {
  let testDb: TestDatabase | null = null;

  beforeAll(async () => {
    try {
      // Create test database container
      testDb = await createTestDatabase();

      // Run migrations to set up schema
      await runMigrations(testDb);

      logger.info('Test database created for client tests');
    } catch (error) {
      logger.error('Failed to create test database', { error });
      throw error;
    }
  }, 60000); // 60 second timeout for container startup

  afterAll(async () => {
    await closeDatabaseConnection();
    await cleanupTestDatabase(testDb);
  });

  describe('createDatabaseClient', () => {
    it('should create database client with valid connection string', () => {
      if (!testDb) throw new Error('Test database not initialized');

      const db = createDatabaseClient({
        connectionString: testDb.connectionString,
      });
      expect(db).toBeDefined();
    });

    it('should use custom connection string when provided', () => {
      if (!testDb) throw new Error('Test database not initialized');

      const db = createDatabaseClient({
        connectionString: testDb.connectionString,
      });
      expect(db).toBeDefined();
    });

    it('should throw error when no connection string provided', () => {
      // Test the error case
      expect(() => createDatabaseClient({ connectionString: '' })).toThrow(
        'DATABASE_URL is not configured'
      );
    });
  });

  describe('checkDatabaseConnection', () => {
    beforeEach(async () => {
      await closeDatabaseConnection();
    });

    it('should return true for valid connection', async () => {
      if (!testDb) throw new Error('Test database not initialized');

      createDatabaseClient({ connectionString: testDb.connectionString });
      const isConnected = await checkDatabaseConnection();
      expect(isConnected).toBe(true);
    });

    it('should handle connection errors gracefully', async () => {
      // Create a client with an invalid connection string
      createDatabaseClient({
        connectionString: 'postgresql://invalid:invalid@localhost:9999/nodb',
      });

      // checkDatabaseConnection should handle the error and return false
      const isConnected = await checkDatabaseConnection();
      expect(isConnected).toBe(false);
    });
  });

  describe('basic queries', () => {
    let db: ReturnType<typeof createDatabaseClient>;

    beforeEach(async () => {
      if (!testDb) throw new Error('Test database not initialized');

      // Close any existing connection and create fresh client
      await closeDatabaseConnection();
      db = createDatabaseClient({ connectionString: testDb.connectionString });

      // Clean up all test data from users table
      await testDb.sql`DELETE FROM "user"."users" WHERE email LIKE 'test%'`;
    });

    afterEach(async () => {
      if (!testDb) return;

      // Clean up test data after each test
      await testDb.sql`DELETE FROM "user"."users" WHERE email LIKE 'test%'`;
    });

    it('should insert and select data', async () => {
      // Insert a user
      const [inserted] = await db
        .insert(users)
        .values({
          email: 'test@example.com',
          passwordHash: 'hashed',
          role: 'user',
        })
        .returning();

      expect(inserted).toBeDefined();
      expect(inserted.email).toBe('test@example.com');
      expect(inserted.id).toBeDefined();

      // Select the user
      const [selected] = await db
        .select()
        .from(users)
        .where(eq(users.email, 'test@example.com'));

      expect(selected).toBeDefined();
      expect(selected.id).toBe(inserted.id);
      expect(selected.email).toBe('test@example.com');
      expect(selected.role).toBe('user');
      expect(selected.isActive).toBe(true);
      expect(selected.isEmailVerified).toBe(false);
    });

    it('should update data', async () => {
      // Insert a user
      const [inserted] = await db
        .insert(users)
        .values({
          email: 'test@example.com',
          passwordHash: 'hashed',
          role: 'user',
        })
        .returning();

      // Update the user
      const [updated] = await db
        .update(users)
        .set({
          firstName: 'Test',
          lastName: 'User',
          isEmailVerified: true,
        })
        .where(eq(users.id, inserted.id))
        .returning();

      expect(updated.firstName).toBe('Test');
      expect(updated.lastName).toBe('User');
      expect(updated.isEmailVerified).toBe(true);
      // The updatedAt trigger should update the timestamp
      expect(updated.updatedAt).toBeDefined();
      expect(updated.id).toBe(inserted.id);
    });

    it('should delete data', async () => {
      // Insert a user
      const [inserted] = await db
        .insert(users)
        .values({
          email: 'test@example.com',
          passwordHash: 'hashed',
          role: 'user',
        })
        .returning();

      // Delete the user
      const deleted = await db
        .delete(users)
        .where(eq(users.id, inserted.id))
        .returning();

      expect(deleted).toHaveLength(1);

      // Verify deletion
      const remaining = await db
        .select()
        .from(users)
        .where(eq(users.id, inserted.id));
      expect(remaining).toHaveLength(0);
    });

    it('should handle unique constraint violations', async () => {
      // Insert a user
      await db.insert(users).values({
        email: 'test@example.com',
        passwordHash: 'hashed',
        role: 'user',
      });

      // Try to insert duplicate
      await expect(
        db.insert(users).values({
          email: 'test@example.com',
          passwordHash: 'hashed2',
          role: 'user',
        })
      ).rejects.toThrow();
    });
  });
});
