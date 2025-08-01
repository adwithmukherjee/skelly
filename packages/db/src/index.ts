import { drizzle } from 'drizzle-orm/postgres-js';

// Database client exports
export {
  createDatabaseClient,
  getDatabaseClient,
  closeDatabaseConnection,
  checkDatabaseConnection,
  type DatabaseConfig,
} from './client';

export type Database = ReturnType<typeof drizzle>;

// Schema exports
export * from './schema';

// Error exports
export * from './errors';

// Migration exports
export { Migrator } from './migrate';

// Seed exports
export { seed, seedUsers } from './seed';

// Re-export drizzle operators for convenience
export {
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  and,
  or,
  not,
  like,
  ilike,
  inArray,
  notInArray,
  isNull,
  isNotNull,
  sql,
} from 'drizzle-orm';
