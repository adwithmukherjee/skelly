# Repository Pattern Guide

This document provides guidance on using the repository pattern in the Skelly application.

## Overview

The repository pattern provides a clean abstraction over data access, whether from databases or external APIs. This package provides base classes and implementations for both scenarios.

## Base Classes

### DatabaseRepository

Abstract base class for all database repositories:

```typescript
export abstract class DatabaseRepository<T> {
  constructor(protected readonly db: Database) {}
  
  abstract findById(id: string): Promise<T | null>;
  abstract findMany(filter?: any): Promise<T[]>;
  abstract create(data: any): Promise<T>;
  abstract update(id: string, data: any): Promise<T>;
  abstract delete(id: string): Promise<void>;
}
```

### DrizzleRepository

Generic base repository for Drizzle ORM tables with full CRUD operations:

```typescript
export abstract class DrizzleRepository<
  TTable extends PgTable,
  TSelect,  // The select type (table.$inferSelect)
  TInsert   // The insert type (table.$inferInsert)
> extends DatabaseRepository<TSelect>
```

### ApiRepository

Base class for external API repositories:

```typescript
export abstract class ApiRepository {
  constructor(protected readonly baseUrl: string) {}
  
  protected async request<T>(
    method: string,
    endpoint: string,
    options?: RequestOptions
  ): Promise<T>;
}
```

## Creating a Database Repository

### Using DrizzleRepository (Recommended)

For Drizzle-based tables, extend the `DrizzleRepository` class:

```typescript
import { posts, type Post, type NewPost } from '@skelly/db';
import { eq, desc, and } from '@skelly/db';
import { DrizzleRepository } from '../base/drizzle.repository';

export class PostRepository extends DrizzleRepository<
  typeof posts,
  Post,    // typeof posts.$inferSelect
  NewPost  // typeof posts.$inferInsert
> {
  protected table = posts;

  // Custom method example
  async findByAuthor(authorId: string): Promise<Post[]> {
    return this.db
      .select()
      .from(this.table)
      .where(eq(this.table.authorId, authorId))
      .orderBy(desc(this.table.createdAt));
  }

  // Custom method using base class helper
  async findPublished(): Promise<Post[]> {
    const conditions = [
      eq(this.table.isPublished, true),
      eq(this.table.isActive, true)
    ];
    return this.findByConditions(conditions);
  }

  // Override base method with custom logic
  async create(data: NewPost): Promise<Post> {
    // Add custom validation or transformation
    const postData = {
      ...data,
      slug: this.generateSlug(data.title),
    };
    
    return super.create(postData);
  }

  private generateSlug(title: string): string {
    return title.toLowerCase().replace(/\s+/g, '-');
  }
}
```

### Available Base Methods

The `DrizzleRepository` provides these methods out of the box:

- `findById(id: string)` - Find a record by ID
- `findAll()` - Get all records
- `findMany(filter?: any)` - Override in subclasses for custom filtering
- `create(data: TInsert)` - Create a new record
- `createMany(data: TInsert[])` - Create multiple records
- `update(id: string, data: Partial<TInsert>)` - Update a record
- `updateMany(conditions: SQL[], data: Partial<TInsert>)` - Update multiple records
- `delete(id: string)` - Delete a record by ID
- `deleteMany(conditions: SQL[])` - Delete multiple records
- `deleteAll()` - Delete all records (use with caution!)
- `count(conditions?: SQL[])` - Count records
- `exists(id: string)` - Check if a record exists
- `transaction(callback)` - Execute operations in a transaction

### Protected Helper Methods

- `findByConditions(conditions?: SQL[])` - Find records by SQL conditions

## Creating an External API Repository

For external APIs, extend the `ApiRepository` class:

```typescript
import { ApiRepository } from '../base/api.repository';

interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
}

export class GitHubRepository extends ApiRepository {
  constructor() {
    super('https://api.github.com');
  }

  async getUser(username: string): Promise<GitHubUser> {
    return this.request<GitHubUser>('GET', `/users/${username}`);
  }

  async getRepositories(username: string): Promise<any[]> {
    return this.request<any[]>('GET', `/users/${username}/repos`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });
  }

  async createGist(data: any): Promise<any> {
    return this.request('POST', '/gists', {
      body: JSON.stringify(data),
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      },
    });
  }
}
```

## Best Practices

### 1. Keep Repositories Focused
Each repository should handle data access for a single domain entity:
- ✅ `UserRepository`, `PostRepository`, `CommentRepository`
- ❌ `DatabaseRepository`, `ApiRepository` (too generic for implementation)

### 2. No Business Logic
Repositories should only contain data access logic:
```typescript
// ✅ Good - Data access only
async findActiveUsers(): Promise<User[]> {
  return this.findByConditions([eq(this.table.isActive, true)]);
}

// ❌ Bad - Contains business logic
async findUsersForNotification(): Promise<User[]> {
  const users = await this.findActiveUsers();
  // Business logic should be in service layer
  return users.filter(u => u.lastLoginAt > thirtyDaysAgo);
}
```

### 3. Use Type Safety
Always specify the correct types for your repository:
```typescript
// ✅ Good - Full type safety
export class ProductRepository extends DrizzleRepository<
  typeof products,
  Product,
  NewProduct
> {
  protected table = products;
}

// ❌ Bad - Using 'any' types
export class ProductRepository extends DatabaseRepository<any> {
  // ...
}
```

### 4. Custom Query Methods
Add repository methods for complex queries:
```typescript
export class OrderRepository extends DrizzleRepository<
  typeof orders,
  Order,
  NewOrder
> {
  protected table = orders;

  async findPendingOrdersWithItems(): Promise<OrderWithItems[]> {
    return this.db
      .select()
      .from(this.table)
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .where(eq(this.table.status, 'pending'))
      .orderBy(desc(this.table.createdAt));
  }

  async getTotalRevenue(startDate: Date, endDate: Date): Promise<number> {
    const [result] = await this.db
      .select({ total: sql<number>`sum(amount)` })
      .from(this.table)
      .where(
        and(
          eq(this.table.status, 'completed'),
          gte(this.table.createdAt, startDate),
          lte(this.table.createdAt, endDate)
        )
      );
    
    return Number(result.total || 0);
  }
}
```

### 5. Error Handling
Let database errors bubble up to the service layer:
```typescript
// Repository - Let errors bubble up
async create(data: NewUser): Promise<User> {
  return super.create(data); // Will throw on constraint violations
}

// Service - Handle errors with business context
async createUser(data: CreateUserDto): Promise<User> {
  try {
    return await this.userRepository.create(data);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      throw new ValidationError('Email already exists');
    }
    throw error;
  }
}
```

## Testing Repositories

### Unit Testing with Mocks
```typescript
describe('UserService', () => {
  let userRepository: jest.Mocked<UserRepository>;
  let userService: UserService;

  beforeEach(() => {
    userRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      // ... other methods
    } as any;

    userService = new UserService({ userRepository, logger });
  });

  it('should create a user', async () => {
    const userData = { email: 'test@example.com' };
    const createdUser = { id: '1', ...userData };
    
    userRepository.create.mockResolvedValue(createdUser);
    
    const result = await userService.create(userData);
    
    expect(result.data).toEqual(createdUser);
    expect(userRepository.create).toHaveBeenCalledWith(userData);
  });
});
```

### Integration Testing
```typescript
describe('UserRepository Integration', () => {
  let repository: UserRepository;
  let db: Database;

  beforeAll(async () => {
    db = await getTestDatabase();
    repository = new UserRepository(db);
  });

  beforeEach(async () => {
    await db.delete(users); // Clean state
  });

  it('should create and find a user', async () => {
    const userData = {
      email: 'test@example.com',
      passwordHash: 'hashed',
      role: UserRole.USER,
    };

    const created = await repository.create(userData);
    expect(created.id).toBeDefined();

    const found = await repository.findById(created.id);
    expect(found).toEqual(created);
  });
});
```

## Migration Guide

### From Direct Database Access to Repository

Before:
```typescript
// In service
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.email, email))
  .limit(1);
```

After:
```typescript
// In repository
async findByEmail(email: string): Promise<User | null> {
  const [user] = await this.db
    .select()
    .from(this.table)
    .where(eq(this.table.email, email))
    .limit(1);
  return user || null;
}

// In service
const user = await this.userRepository.findByEmail(email);
```

### Benefits of Migration
1. **Testability**: Easy to mock repositories in service tests
2. **Reusability**: Data access logic can be shared across services
3. **Maintainability**: Changes to queries happen in one place
4. **Type Safety**: Strong typing throughout the application
5. **Consistency**: Standard patterns for all data access