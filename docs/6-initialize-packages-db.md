# Initialize packages/db Design Decisions

This document tracks the design decisions made during TICKET-006: Initialize packages/db.

## High-Level Approach & Design Decisions

### Package Purpose
The db package will provide:
1. **Database Schema** - Drizzle ORM schema definitions
2. **Database Client** - Configured PostgreSQL connection
3. **Migration System** - Schema versioning and updates
4. **Query Helpers** - Common database operations
5. **Seed Scripts** - Development data setup

### Technology Choices

#### Drizzle ORM
**Decision**: Use Drizzle ORM over alternatives (Prisma, TypeORM, Knex)
**Rationale**:
- Type-safe SQL-like syntax
- Excellent TypeScript integration
- Minimal runtime overhead
- Great migration tooling
- No code generation step
- Works well with PostgreSQL features

#### PostgreSQL Driver
**Decision**: Use `postgres` (node-postgres) driver
**Rationale**:
- Battle-tested and stable
- Excellent performance
- Native PostgreSQL feature support
- Connection pooling built-in

### Architecture Design

#### Schema Organization
```
packages/db/
├── src/
│   ├── schema/          # Drizzle schema definitions
│   │   ├── user/        # User schema
│   │   │   ├── users.ts # Users table
│   │   │   └── index.ts # User schema exports
│   │   └── index.ts     # All schema exports
│   ├── client.ts        # Database client setup
│   ├── migrate.ts       # Migration runner
│   ├── seed.ts          # Seed data script
│   ├── errors.ts        # DB-specific errors
│   └── index.ts         # Main exports
├── migrations/          # SQL migration files
├── drizzle.config.ts    # Drizzle configuration
└── package.json
```

#### Connection Management
**Design Decisions**:
1. **Single shared client** - One connection pool for the entire app
2. **Environment-based config** - Use DATABASE_URL from env
3. **Connection pooling** - Default pool size based on environment
4. **Graceful shutdown** - Proper cleanup on app termination
5. **Health checks** - Expose connection status

#### Schema Design Principles
1. **UUID primary keys** - For all tables (better for distributed systems)
2. **Timestamps** - createdAt/updatedAt on all entities
3. **Soft deletes** - deletedAt for recoverable deletion
4. **Consistent naming** - snake_case for DB, camelCase in code
5. **Proper indexes** - On foreign keys and commonly queried fields

### Migration Strategy
**Design Decisions**:
1. **SQL migrations** - Not using Drizzle's push for production
2. **Timestamp-based naming** - YYYYMMDDHHMMSS_description.sql
3. **Up/down in single file** - Using markers `-- +migrate Up` and `-- +migrate Down`
4. **Required down migrations** - Every migration must include rollback logic
5. **Migration table** - Track applied migrations
6. **Transaction safety** - Each migration runs in a transaction
7. **CLI support** - `up`, `down [steps]`, and `status` commands

### Error Handling
Following the hybrid error pattern:
- Base `DatabaseError` extending `AppError`
- Specific errors:
  - `ConnectionError` - Can't connect to DB
  - `QueryError` - SQL execution failed
  - `ConstraintError` - Unique/foreign key violations
  - `TimeoutError` - Query timeout

### Testing Approach
1. **Test database** - Separate DB for tests
2. **Migration tests** - Ensure migrations run cleanly
3. **Transaction rollback** - Tests don't affect each other
4. **Mock for unit tests** - Don't require DB for service tests

### Seed Data
**Design**:
- Development seeds for local testing
- Test seeds for integration tests
- Production seeds for initial setup (roles, permissions)
- Idempotent operations

## Implementation Plan

1. Set up package structure and dependencies
2. Create database client with connection pooling
3. Define initial schema (users table)
4. Set up migration system
5. Create DB-specific error classes
6. Add seed script for development
7. Write tests for connection and basic queries
8. Document usage patterns

## Confirmed Design Decisions

Based on discussion, we will:

1. **Use UUID primary keys** for all tables
2. **Write SQL migrations manually** for full control and clarity
3. **Use single connection pool** shared across each compute instance
4. **Use real PostgreSQL for tests** for accuracy
5. **Create only users table** in this ticket (other tables in future tickets)

## Implementation Starting

With these decisions confirmed, proceeding with implementation...

### Additional Design Decisions During Implementation

1. **PostgreSQL Schemas**: Using PostgreSQL schemas to organize tables (e.g., `user.users` table)
   - Better organization for larger applications
   - Namespace isolation
   - Easier permissions management

2. **No PG Enums**: Using text columns with constraints instead of PostgreSQL enums
   - Easier to modify (add/remove values)
   - Simpler migration rollbacks
   - No special enum type management

## Implementation Complete

### What Was Built

1. **Database Client** (`client.ts`)
   - Connection pooling with configurable settings
   - Graceful shutdown handling
   - Health check functionality
   - Environment-based configuration

2. **Migration System** (`migrate.ts`)
   - Up/down migrations in single files with markers
   - Transaction safety for each migration
   - CLI with up, down, and status commands
   - Rollback support with configurable steps

3. **Schema Structure**
   - User schema with users table
   - Directory structure matching PostgreSQL schemas
   - Drizzle ORM integration with type inference

4. **Error Handling** (`errors.ts`)
   - Database-specific error classes
   - Constraint violation handling
   - Proper error codes and status mapping

5. **Seed System** (`seed.ts`)
   - Idempotent seed scripts
   - Development data setup
   - Extensible for future tables

6. **Testing**
   - Migration system tests (up/down/parse)
   - Database connection tests
   - Basic CRUD operation tests
   - Constraint violation tests

7. **Documentation**
   - Comprehensive claude.md with patterns
   - Migration best practices
   - Query examples
   - Performance tips

## Summary

Successfully initialized the @skelly/db package with:
- ✅ Drizzle ORM and PostgreSQL driver installed
- ✅ Database connection with pooling configured
- ✅ Base schema structure with user.users table
- ✅ Migration tooling with up/down support
- ✅ Seed script structure
- ✅ Comprehensive error handling
- ✅ Unit and integration tests
- ✅ Pattern documentation for future development
- ✅ NPM scripts for database operations

The database package is now ready for use by other packages and applications in the monorepo. It provides a solid foundation for data persistence with proper migrations, type safety, and error handling.