# @skelly/db

Type-safe PostgreSQL database client using Drizzle ORM.

## Installation

```bash
npm install @skelly/db
```

## Quick Start

```typescript
import { getDatabaseClient, users, eq } from '@skelly/db';

const db = getDatabaseClient();
const user = await db.select().from(users).where(eq(users.email, 'user@example.com'));
```

## Client Setup

```typescript
import { createDatabaseClient, getDatabaseClient, closeDatabaseConnection } from '@skelly/db';

// Use DATABASE_URL environment variable
const db = getDatabaseClient();

// Custom configuration
const db = createDatabaseClient({
  connectionString: 'postgresql://user:pass@localhost:5432/mydb',
  max: 20,
  idleTimeout: 20,
  connectionTimeout: 10,
});

// Cleanup
await closeDatabaseConnection();
```

## Schema & Types

Available tables: `users`

```typescript
import { users, User, NewUser } from '@skelly/db';

type User = {
  id: string;
  email: string;
  username?: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  role: 'user' | 'admin' | 'moderator';
  isEmailVerified: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};
```

## Query Operations

### Available Operators

```typescript
import { eq, ne, gt, gte, lt, lte, and, or, not, like, ilike, inArray, notInArray, isNull, isNotNull, sql } from '@skelly/db';
```

### CRUD Examples

```typescript
// Create
const [user] = await db.insert(users).values({
  email: 'user@example.com',
  passwordHash: 'hashed'
}).returning();

// Read
const activeUsers = await db.select().from(users).where(eq(users.isActive, true));

// Update
await db.update(users).set({ firstName: 'Jane' }).where(eq(users.id, userId));

// Delete
await db.delete(users).where(eq(users.id, userId));

// Complex queries
const filtered = await db.select().from(users).where(
  and(eq(users.isActive, true), inArray(users.role, ['admin', 'moderator']))
);

// Transactions
await db.transaction(async (tx) => {
  const [user] = await tx.insert(users).values(userData).returning();
  await tx.update(users).set({ firstName: 'John' }).where(eq(users.id, user.id));
});
```

## Error Handling

```typescript
import { UniqueConstraintError, ForeignKeyConstraintError, ConnectionError } from '@skelly/db';

try {
  await db.insert(users).values(userData);
} catch (error) {
  if (error instanceof UniqueConstraintError) {
    console.error('Duplicate email:', error.details.field);
  } else if (error.code === '23505') {
    throw new UniqueConstraintError('email', userData.email);
  }
}
```

## Migrations

```typescript
import { Migrator } from '@skelly/db';

const migrator = new Migrator();
await migrator.up();           // Run pending migrations
await migrator.down(2);        // Rollback 2 migrations
await migrator.status();       // Check status
await migrator.close();
```

## Seeding

```typescript
import { seed, seedUsers } from '@skelly/db';

await seed();        // Seed all data
await seedUsers();   // Seed only users
```

## Environment Variables

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/skelly_dev
NODE_ENV=development
```

## Best Practices

- Use transactions for related operations
- Handle specific error types (UniqueConstraintError, etc.)
- Validate data before database operations
- Reuse database client instances
- Close connections on shutdown

## Testing

```typescript
beforeEach(async () => {
  const db = getDatabaseClient();
  await db.execute(sql`BEGIN`);
});

afterEach(async () => {
  const db = getDatabaseClient();
  await db.execute(sql`ROLLBACK`);
});
``` 
