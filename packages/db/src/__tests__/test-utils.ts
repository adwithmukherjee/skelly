import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Migrator } from '../migrate';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { logger } from '@skelly/utils';

export interface TestDatabase {
  container: StartedPostgreSqlContainer;
  connectionString: string;
  migrator: Migrator;
  sql: postgres.Sql;
  db: ReturnType<typeof drizzle>;
}

/**
 * Creates an in-memory PostgreSQL container for testing
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  logger.info('Starting PostgreSQL test container...');
  
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('test_db')
    .withUsername('test_user')
    .withPassword('test_pass')
    .start();
  
  const connectionString = container.getConnectionUri();
  logger.info('Test container started', { connectionString });
  
  const migrator = new Migrator(connectionString);
  const sql = postgres(connectionString, {
    onnotice: () => {}, // Suppress NOTICE messages
  });
  const db = drizzle(sql);
  
  return {
    container,
    connectionString,
    migrator,
    sql,
    db,
  };
}

/**
 * Cleans up test database resources
 */
export async function cleanupTestDatabase(testDb: TestDatabase | null): Promise<void> {
  if (!testDb) {
    return;
  }
  
  logger.info('Cleaning up test database...');
  
  try {
    if (testDb.migrator) {
      await testDb.migrator.close();
    }
    if (testDb.sql) {
      await testDb.sql.end();
    }
    if (testDb.container) {
      await testDb.container.stop();
    }
    logger.info('Test database cleaned up successfully');
  } catch (error) {
    logger.error('Error cleaning up test database', { error });
    throw error;
  }
}

/**
 * Runs migrations on the test database
 */
export async function runMigrations(testDb: TestDatabase): Promise<void> {
  logger.info('Running migrations on test database...');
  await testDb.migrator.up();
  logger.info('Migrations completed');
}