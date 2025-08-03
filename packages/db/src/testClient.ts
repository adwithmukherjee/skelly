import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { logger } from '@skelly/utils';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { ConnectionError } from './errors';
import * as schema from './schema';
import { Migrator } from './migrate';
import { DbClient } from './client';

let testContainer: StartedPostgreSqlContainer | undefined;
let client: postgres.Sql | undefined;
let db: ReturnType<typeof drizzle> | undefined;

export interface TestDatabaseConfig {
  database?: string;
  username?: string;
  password?: string;
  max?: number;
  idleTimeout?: number;
  connectionTimeout?: number;
}

export const createDatabaseClient = async (config: TestDatabaseConfig = {}) => {
  if (!testContainer) {
    try {
      logger.info('Starting PostgreSQL test container...');

      testContainer = await new PostgreSqlContainer('postgres:16-alpine')
        .withDatabase(config.database || 'test_db')
        .withUsername(config.username || 'test_user')
        .withPassword(config.password || 'test_pass')
        .start();

      logger.info('Test container started', {
        connectionString: testContainer.getConnectionUri(),
      });
    } catch (error) {
      throw new ConnectionError('Failed to start test container', { error });
    }
  }

  const connectionString = testContainer.getConnectionUri();

  try {
    client = postgres(connectionString, {
      max: config.max || 5,
      idle_timeout: config.idleTimeout || 20,
      connect_timeout: config.connectionTimeout || 10,
      onnotice: () => {}, // Suppress NOTICE messages in tests
    });

    db = drizzle(client, { schema });

    logger.info('Test database client initialized', {
      host: new URL(connectionString).hostname,
      max: config.max || 5,
    });

    return db;
  } catch (error) {
    throw new ConnectionError('Failed to initialize test database client', {
      error,
    });
  }
};

export const getDatabaseClient = async () => {
  if (!db) {
    db = await createDatabaseClient();
  }
  return db;
};

export const closeDatabaseConnection = async () => {
  logger.info('Closing test database connection...');

  try {
    if (client) {
      await client.end();
      client = undefined;
      db = undefined;
      logger.info('Test database client connection closed');
    }

    if (testContainer) {
      await testContainer.stop();
      testContainer = undefined;
      logger.info('Test container stopped');
    }
  } catch (error) {
    logger.error('Error closing test database connection', { error });
    throw error;
  }
};

export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    await getDatabaseClient();
    await client!`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Test database health check failed', { error });
    return false;
  }
};

// Get the test container instance (useful for advanced test scenarios)
export const getTestContainer = (): StartedPostgreSqlContainer | undefined => {
  return testContainer;
};

// Get the connection string for the test database
export const getConnectionString = (): string | undefined => {
  return testContainer?.getConnectionUri();
};

export const runMigrations = async () => {
  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error('Test database connection string not found');
  }
  const migrator = new Migrator(connectionString);
  await migrator.up();
};

export type TestDatabase = ReturnType<typeof drizzle>;

export const testDbClient: DbClient = {
  create: createDatabaseClient,
  get: getDatabaseClient,
  close: closeDatabaseConnection,
  check: checkDatabaseConnection,
};

// Graceful shutdown for test environment
const handleShutdown = async () => {
  await closeDatabaseConnection();
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

// Additional cleanup for test processes
process.on('exit', handleShutdown);
process.on('beforeExit', handleShutdown);
