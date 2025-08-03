import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createEnv, logger } from '@skelly/utils';
import { z } from 'zod';
import { ConnectionError } from './errors';
import * as schema from './schema';

// Define DB-specific environment schema
const dbEnv = createEnv((base) => ({
  ...base.shape,
  DATABASE_URL: z.string().url().optional(),
}));

let client: postgres.Sql | undefined;
let db: ReturnType<typeof drizzle> | undefined;

export interface DatabaseConfig {
  connectionString?: string;
  max?: number;
  idleTimeout?: number;
  connectionTimeout?: number;
}

export type Database = ReturnType<typeof drizzle>;

export const createDatabaseClient = async (config: DatabaseConfig = {}) => {
  const connectionString = config.connectionString || dbEnv.DATABASE_URL;

  if (!connectionString) {
    throw new ConnectionError('DATABASE_URL is not configured');
  }

  try {
    client = postgres(connectionString, {
      max: config.max || (dbEnv.NODE_ENV === 'production' ? 20 : 5),
      idle_timeout: config.idleTimeout || 20,
      connect_timeout: config.connectionTimeout || 10,
      onnotice:
        dbEnv.NODE_ENV === 'development'
          ? (notice) => logger.debug('PostgreSQL Notice:', notice)
          : undefined,
    });

    db = drizzle(client, { schema });

    logger.info('Database client initialized', {
      host: new URL(connectionString).hostname,
      max: config.max || (dbEnv.NODE_ENV === 'production' ? 20 : 5),
    });

    return db;
  } catch (error) {
    throw new ConnectionError('Failed to initialize database client', {
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
  if (client) {
    await client.end();
    client = undefined;
    db = undefined;
    logger.info('Database connection closed');
  }
};

export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    await getDatabaseClient();
    await client!`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database health check failed', { error });
    return false;
  }
};

export const dbClient = {
  create: createDatabaseClient,
  get: getDatabaseClient,
  close: closeDatabaseConnection,
  check: checkDatabaseConnection,
};

export type DbClient = typeof dbClient;

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeDatabaseConnection();
});

process.on('SIGTERM', async () => {
  await closeDatabaseConnection();
});
