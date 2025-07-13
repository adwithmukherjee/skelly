# Database Package Pattern Guide

This document outlines patterns for working with the @skelly/db package and adding new database functionality.

## Schema Organization

### PostgreSQL Schema Structure
We use PostgreSQL schemas to organize tables by domain:
```
user.users        # User domain tables
auth.sessions     # Authentication domain tables
billing.invoices  # Billing domain tables
```

### Directory Structure
Mirror the PostgreSQL schema structure in the codebase:
```
src/schema/
├── user/
│   ├── users.ts
│   └── index.ts
├── auth/
│   ├── sessions.ts
│   └── index.ts
└── index.ts
```

## Adding New Tables

### 1. Create Schema File
```typescript
// src/schema/domain/table_name.ts
import { pgTable, pgSchema, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Create or reference schema
export const domainSchema = pgSchema('domain');

// Define table
export const tableName = domainSchema.table('table_name', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  // ... other columns
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

// Export types
export type TableName = typeof tableName.$inferSelect;
export type NewTableName = typeof tableName.$inferInsert;
```

### 2. Create Migration
```sql
-- migrations/YYYYMMDDHHMMSS_create_domain_table.sql

-- +migrate Up

-- Create schema if needed
CREATE SCHEMA IF NOT EXISTS "domain";

-- Create table
CREATE TABLE "domain"."table_name" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- other columns
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX "idx_table_name_created_at" ON "domain"."table_name" ("created_at");

-- Add updated_at trigger
CREATE TRIGGER update_table_name_updated_at BEFORE UPDATE
  ON "domain"."table_name" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- +migrate Down

-- Drop everything in reverse order
DROP TRIGGER IF EXISTS update_table_name_updated_at ON "domain"."table_name";
DROP TABLE IF EXISTS "domain"."table_name";
-- Only drop schema if this is the last table in it
-- DROP SCHEMA IF EXISTS "domain";
```

### 3. Export from Index Files
```typescript
// src/schema/domain/index.ts
export * from './table_name';

// src/schema/index.ts
export * from './domain';
```

### 4. Validate Schema Consistency
After creating or modifying schemas, run the schema validation test to ensure your Drizzle definitions match the database:
```bash
npm run test:schema
```
This test uses Docker to spin up a real PostgreSQL instance and verifies that your schema definitions are correctly synchronized with the database structure.

**Important**: When adding new tables, you must update `src/__tests__/schema-validation.test.ts` to include them:
```typescript
// Import your new table
import { users } from '../schema/user/users';
import { yourNewTable } from '../schema/domain/table';

// Add to the tables to test (around line 39)
const tablesToTest = [
  { name: 'users', table: users },
  { name: 'yourNewTable', table: yourNewTable }  // Add your new table here
];

// Also update the schemas to include when connecting pg-structure (line 25)
pgDb = await pgStructure(testDb.connectionString, {
  includeSchemas: ['public', 'user', 'yourNewSchema'], // Add your schema here
});
```

## Migration Best Practices

### Naming Conventions
- Format: `YYYYMMDDHHMMSS_verb_description.sql`
- Examples:
  - `20240101120000_create_user_schema.sql`
  - `20240102090000_add_user_preferences.sql`
  - `20240103150000_alter_user_add_avatar.sql`

### Migration Structure
```sql
-- +migrate Up
-- Forward migration SQL here
-- Always use IF NOT EXISTS/IF EXISTS clauses

-- +migrate Down
-- Reverse migration SQL here
-- Must completely undo the Up migration
-- OK to lose data - down migrations should work
```

### Common Patterns

#### Adding a Column
```sql
-- +migrate Up
ALTER TABLE "schema"."table" 
ADD COLUMN IF NOT EXISTS "column_name" TYPE DEFAULT default_value;

-- +migrate Down
ALTER TABLE "schema"."table" 
DROP COLUMN IF EXISTS "column_name";
```

#### Creating an Index
```sql
-- +migrate Up
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_name" 
ON "schema"."table" ("column");

-- +migrate Down
DROP INDEX IF EXISTS "schema"."idx_name";
```

#### Adding a Constraint
```sql
-- +migrate Up
ALTER TABLE "schema"."table"
ADD CONSTRAINT "constraint_name" CHECK (condition);

-- +migrate Down
ALTER TABLE "schema"."table"
DROP CONSTRAINT IF EXISTS "constraint_name";
```

## Query Patterns

### Basic CRUD
```typescript
import { db } from '@skelly/db';
import { users } from '@skelly/db/schema';
import { eq, and, or } from '@skelly/db';

// Create
const [user] = await db.insert(users).values({
  email: 'test@example.com',
  passwordHash: 'hashed',
}).returning();

// Read
const user = await db.select().from(users)
  .where(eq(users.email, 'test@example.com'))
  .limit(1);

// Update
await db.update(users)
  .set({ lastLoginAt: new Date() })
  .where(eq(users.id, userId));

// Delete
await db.delete(users)
  .where(eq(users.id, userId));
```

### Transactions
```typescript
await db.transaction(async (tx) => {
  const user = await tx.insert(users).values(userData).returning();
  await tx.insert(profiles).values({ userId: user[0].id, ...profileData });
});
```

### Complex Queries
```typescript
// Joins
const usersWithProfiles = await db
  .select()
  .from(users)
  .leftJoin(profiles, eq(users.id, profiles.userId))
  .where(eq(users.isActive, true));

// Aggregations
const userCount = await db
  .select({ count: sql<number>`count(*)` })
  .from(users)
  .where(eq(users.role, 'admin'));
```

## Error Handling

### Database Errors
```typescript
import { UniqueConstraintError, ForeignKeyConstraintError } from '@skelly/db';

try {
  await db.insert(users).values(userData);
} catch (error) {
  // Check for specific constraint violations
  if (error.code === '23505') { // Unique violation
    throw new UniqueConstraintError('email', userData.email);
  }
  if (error.code === '23503') { // Foreign key violation
    throw new ForeignKeyConstraintError('roleId');
  }
  throw error;
}
```

### Common PostgreSQL Error Codes
- `23505` - Unique constraint violation
- `23503` - Foreign key constraint violation
- `23502` - Not null constraint violation
- `23514` - Check constraint violation
- `42P01` - Undefined table
- `42703` - Undefined column

## Testing Database Code

### Test Helpers
```typescript
// In tests, wrap in transactions that rollback
import { db } from '@skelly/db';

beforeEach(async () => {
  await db.execute(sql`BEGIN`);
});

afterEach(async () => {
  await db.execute(sql`ROLLBACK`);
});
```

### Test Data Builders
```typescript
// Create test data factories
export const createTestUser = (overrides = {}) => ({
  email: `test-${Date.now()}@example.com`,
  passwordHash: 'hashed',
  role: 'user',
  ...overrides,
});
```

## Performance Tips

1. **Always add indexes** on:
   - Foreign key columns
   - Columns used in WHERE clauses
   - Columns used in ORDER BY

2. **Use EXPLAIN ANALYZE** in development:
   ```typescript
   const plan = await db.execute(sql`
     EXPLAIN ANALYZE 
     SELECT * FROM users WHERE email = 'test@example.com'
   `);
   ```

3. **Batch operations** when possible:
   ```typescript
   // Good - single query
   await db.insert(users).values([user1, user2, user3]);
   
   // Bad - multiple queries
   for (const user of users) {
     await db.insert(users).values(user);
   }
   ```

4. **Use partial indexes** for filtered queries:
   ```sql
   CREATE INDEX idx_active_users 
   ON users (email) 
   WHERE is_active = true;
   ```

## Security Considerations

1. **Never interpolate user input** - Always use parameterized queries
2. **Validate data** before database operations
3. **Use least privilege** - App user shouldn't have DDL permissions
4. **Encrypt sensitive data** at rest
5. **Audit sensitive operations** with triggers or application logging