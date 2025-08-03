import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest';
import { Migrator } from '../migrate';
import {
  createDatabaseClient,
  getConnectionString,
  TestDatabase,
  closeDatabaseConnection,
} from '../testClient';
import { logger } from '@skelly/utils';
import { sql } from 'drizzle-orm';
import { initializeConfig } from '../../../../apps/api/src/config';

describe('Migration System', () => {
  let testDb: TestDatabase | null = null;
  let migrator: Migrator;

  beforeAll(async () => {
    try {
      // Create test database container
      initializeConfig({
        NODE_ENV: 'test',
      });
      testDb = await createDatabaseClient();
      logger.info('Test database created for migration tests');
    } catch (error) {
      logger.error('Failed to create test database', { error });
      throw error;
    }
  }, 60000); // 60 second timeout for container startup

  afterAll(async () => {
    await closeDatabaseConnection();
  });

  beforeEach(async () => {
    if (!testDb) throw new Error('Test database not initialized');

    // Clean up any existing test data
    await testDb.execute(sql`DROP TABLE IF EXISTS migrations`);
    await testDb.execute(sql`DROP SCHEMA IF EXISTS test CASCADE`);

    // Create test migrator with the container connection string
    migrator = new Migrator(getConnectionString()!);
  });

  afterEach(async () => {
    await migrator.close();
  });

  describe('parseMigration', () => {
    it('should parse migration with up and down sections', () => {
      const content = `
-- +migrate Up
CREATE SCHEMA test;
CREATE TABLE test.items (id INT);

-- +migrate Down
DROP TABLE test.items;
DROP SCHEMA test;
      `;

      const parsed = migrator.parseMigration(content);

      expect(parsed.up).toContain('CREATE SCHEMA test');
      expect(parsed.up).toContain('CREATE TABLE test.items');
      expect(parsed.down).toContain('DROP TABLE test.items');
      expect(parsed.down).toContain('DROP SCHEMA test');
    });

    it('should throw error if missing up marker', () => {
      const content = `
CREATE SCHEMA test;
-- +migrate Down
DROP SCHEMA test;
      `;

      expect(() => migrator.parseMigration(content)).toThrow(
        'Migration missing "-- +migrate Up" marker'
      );
    });

    it('should throw error if missing down marker', () => {
      const content = `
-- +migrate Up
CREATE SCHEMA test;
      `;

      expect(() => migrator.parseMigration(content)).toThrow(
        'Migration missing "-- +migrate Down" marker'
      );
    });

    it('should throw error if up section is empty', () => {
      const content = `
-- +migrate Up
-- +migrate Down
DROP SCHEMA test;
      `;

      expect(() => migrator.parseMigration(content)).toThrow(
        'Migration has empty Up section'
      );
    });

    it('should throw error if down section is empty', () => {
      const content = `
-- +migrate Up
CREATE SCHEMA test;
-- +migrate Down
      `;

      expect(() => migrator.parseMigration(content)).toThrow(
        'Migration has empty Down section'
      );
    });
  });

  describe('up migrations', () => {
    it('should initialize migrations table', async () => {
      if (!testDb) throw new Error('Test database not initialized');

      await migrator.initialize();

      const tables = await testDb.execute(sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'migrations'
      `);

      expect(tables).toHaveLength(1);
    });

    it('should track applied migrations', async () => {
      if (!testDb) throw new Error('Test database not initialized');

      await migrator.initialize();

      // Manually insert a migration record
      await testDb.execute(
        sql`INSERT INTO migrations (name) VALUES ('test_migration.sql')`
      );

      const applied = await migrator.getAppliedMigrations();
      expect(applied.has('test_migration.sql')).toBe(true);
    });

    it('should run migration and record it', async () => {
      if (!testDb) throw new Error('Test database not initialized');

      // Create a test migration
      const testMigration = `
-- +migrate Up
CREATE SCHEMA test;
CREATE TABLE test.items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

-- +migrate Down
DROP TABLE IF EXISTS test.items;
DROP SCHEMA IF EXISTS test;
      `;

      // Mock file reading to return our test migration
      const originalReadFile = migrator.constructor.prototype.getMigrationFiles;
      migrator.getMigrationFiles = async () => ['test_001.sql'];

      const originalRunMigration = migrator.runMigration.bind(migrator);
      migrator.runMigration = async (
        filename: string,
        direction?: 'up' | 'down'
      ) => {
        if (filename === 'test_001.sql') {
          const parsed = migrator.parseMigration(testMigration);
          const sqlContent = direction === 'up' ? parsed.up : parsed.down;

          await testDb!.transaction(async (tx) => {
            await tx.execute(sql.raw(sqlContent));

            if (direction === 'up') {
              await tx.execute(
                sql`INSERT INTO migrations (name) VALUES (${filename})`
              );
            } else {
              await tx.execute(
                sql`DELETE FROM migrations WHERE name = ${filename}`
              );
            }
          });
          return;
        }
        return originalRunMigration(filename, direction);
      };

      await migrator.up();

      // Verify schema was created
      const schemas = await testDb.execute(sql`
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name = 'test'
      `);
      expect(schemas).toHaveLength(1);

      // Verify table was created
      const tables = await testDb.execute(sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'test'
        AND table_name = 'items'
      `);
      expect(tables).toHaveLength(1);

      // Verify migration was recorded
      const migrations = await testDb.execute(
        sql`SELECT name FROM migrations WHERE name = 'test_001.sql'`
      );
      expect(migrations).toHaveLength(1);
    });
  });

  describe('down migrations', () => {
    it('should rollback migrations in reverse order', async () => {
      if (!testDb) throw new Error('Test database not initialized');

      await migrator.initialize();

      // Insert two migration records
      await testDb.execute(
        sql`INSERT INTO migrations (name) VALUES ('001_first.sql'), ('002_second.sql')`
      );

      // Mock the runMigration to track calls
      const rollbackCalls: string[] = [];
      migrator.runMigration = async (
        filename: string,
        direction?: 'up' | 'down'
      ) => {
        if (direction === 'down') {
          rollbackCalls.push(filename);
          await testDb!.execute(
            sql`DELETE FROM migrations WHERE name = ${filename}`
          );
        }
      };

      await migrator.down(2);

      // Verify migrations were rolled back in reverse order
      expect(rollbackCalls).toEqual(['002_second.sql', '001_first.sql']);

      // Verify migrations were removed from database
      const remaining = await testDb.execute(sql`SELECT name FROM migrations`);
      expect(remaining).toHaveLength(0);
    });

    it('should rollback only specified number of steps', async () => {
      if (!testDb) throw new Error('Test database not initialized');

      await migrator.initialize();

      // Insert three migration records
      await testDb.execute(
        sql`
        INSERT INTO migrations (name)
        VALUES ('001_first.sql'), ('002_second.sql'), ('003_third.sql')
      `
      );

      // Mock the runMigration
      migrator.runMigration = async (
        filename: string,
        direction?: 'up' | 'down'
      ) => {
        if (direction === 'down') {
          await testDb!.execute(
            sql`DELETE FROM migrations WHERE name = ${filename}`
          );
        }
      };

      await migrator.down(1);

      // Verify only the latest migration was rolled back
      const remaining = await testDb.execute(
        sql`SELECT name FROM migrations ORDER BY name`
      );
      expect(remaining).toHaveLength(2);
      expect(remaining[0].name).toBe('001_first.sql');
      expect(remaining[1].name).toBe('002_second.sql');
    });

    it('should handle no migrations to rollback gracefully', async () => {
      await migrator.initialize();

      // No migrations in database
      await expect(migrator.down()).resolves.not.toThrow();
    });
  });

  describe('status', () => {
    it('should show migration status correctly', async () => {
      if (!testDb) throw new Error('Test database not initialized');

      await migrator.initialize();

      // Insert one applied migration
      await testDb.execute(
        sql`INSERT INTO migrations (name) VALUES ('001_applied.sql')`
      );

      // Mock getMigrationFiles to return two migrations
      migrator.getMigrationFiles = async () => [
        '001_applied.sql',
        '002_pending.sql',
      ];

      // Capture console output
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (msg: string) => logs.push(msg);

      try {
        await migrator.status();

        expect(logs.join('\n')).toContain('✓ 001_applied.sql');
        expect(logs.join('\n')).toContain('✗ 002_pending.sql');
        expect(logs.join('\n')).toContain('Total: 2 | Applied: 1 | Pending: 1');
      } finally {
        console.log = originalLog;
      }
    });
  });
});
