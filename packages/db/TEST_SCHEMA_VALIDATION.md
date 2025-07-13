# Database Testing with In-Memory PostgreSQL

This package uses in-memory PostgreSQL containers for all database tests, providing complete isolation and reproducibility without requiring a dedicated test database.

## Testing Philosophy

All database tests should use the in-memory PostgreSQL containers provided by `test-utils.ts` rather than connecting to a dedicated test database. This approach:
- Ensures test isolation - each test suite gets a fresh database
- Eliminates test database setup/teardown complexity
- Provides consistent test environments across different machines
- Prevents test pollution from failed or interrupted test runs

## Prerequisites

- Docker must be installed and running
- Node.js 18+ (for testcontainers)

## Running Schema Validation Tests

```bash
# Run only the schema validation test
npm run test:schema

# Run all tests (including schema validation)
npm test
```

## What the Tests Validate

The schema validation test performs the following checks:

### 1. Table Existence
- Verifies all Drizzle-defined tables exist in the database
- Checks tables are in the correct schema (e.g., `user.users`)

### 2. Column Validation
- All Drizzle columns exist in the database
- No extra columns exist in the database that aren't in Drizzle
- Column properties match:
  - Data types (uuid, text, timestamp, etc.)
  - Nullable constraints
  - Unique constraints
  - Primary key constraints
  - Default values

### 3. Index Validation
- Primary key indexes exist
- Unique indexes for unique columns
- Custom indexes defined in migrations

### 4. Constraint Validation
- Check constraints (e.g., enum values for role column)
- Foreign key relationships (when added)

### 5. Schema Completeness
- All schemas used in Drizzle exist in the database
- Migration coverage is complete

## Test Architecture

The tests use:
- **@testcontainers/postgresql**: Spins up a real PostgreSQL instance in Docker
- **pg-structure**: Introspects the database schema for comparison
- **test-utils.ts**: Provides reusable test database setup/teardown
- **Migrator**: Runs actual migrations on the test database

## Test Flow

1. Start a PostgreSQL container using `createTestDatabase()`
2. Run all migrations
3. Introspect the database schema
4. Compare with Drizzle schema definitions
5. Report any mismatches
6. Clean up resources with `cleanupTestDatabase()`

## Using Test Utilities

All database tests should follow this pattern:

```typescript
import { createTestDatabase, cleanupTestDatabase, TestDatabase } from './test-utils';

describe('My Database Test', () => {
  let testDb: TestDatabase | null = null;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    // Optionally run migrations
    await runMigrations(testDb);
  }, 60000); // 60 second timeout for container startup

  afterAll(async () => {
    await cleanupTestDatabase(testDb);
  });

  it('should test something', async () => {
    // Use testDb.sql for queries
    const result = await testDb.sql`SELECT 1 as one`;
    expect(result[0].one).toBe(1);
  });
});
```

## Adding New Schema Tests

When adding new tables or columns:

1. Update the Drizzle schema in `src/schema/`
2. Create corresponding migration in `migrations/`
3. Run `npm run test:schema` to ensure consistency

## Troubleshooting

### Docker not running
```
Error: Cannot connect to Docker
```
Solution: Start Docker Desktop or Docker daemon

### Test timeout
If tests timeout, increase the timeout in `vitest.config.ts`:
```ts
testTimeout: 120000, // 2 minutes
```

### Container cleanup issues
If containers aren't cleaned up properly:
```bash
docker ps -a | grep postgres
docker rm -f <container-id>
```