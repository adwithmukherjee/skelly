import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/**/*.ts',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/skelly_dev',
  },
  verbose: true,
  strict: true,
} satisfies Config;