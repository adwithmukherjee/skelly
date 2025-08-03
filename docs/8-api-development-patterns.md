# TICKET-008: API Development Patterns and User Management Implementation

This document details the evolution of API patterns and the implementation of comprehensive user management endpoints, focusing on dependency injection, handler functions, and test-driven development.

## Overview

Building upon the Express server foundation from Ticket 7, this ticket established robust patterns for API development and implemented a complete user management system as the reference implementation.

## Major Design Decisions

### 1. Dependency Injection Pattern

#### Evolution
Initially considered a controller-based pattern but evolved to a more functional, dependency-injection approach that better supports:
- Testability through easy mocking
- Explicit dependencies
- Immutability and functional programming principles
- Type safety throughout

#### Implementation
```typescript
// Container pattern for centralized dependency management
export async function initializeContainer(inputs?: { dbClient?: DbClient }) {
  const db = inputs?.dbClient ?? dbClient;
  
  userService = new UserService({
    db: await db.get(),
  });
  
  userDeps = {
    userService,
  };
}
```

#### Benefits
- **Test isolation**: Tests can inject mock dependencies
- **Clear contracts**: Dependencies are explicit in interfaces
- **Runtime safety**: Container initialization checks
- **Flexibility**: Easy to swap implementations

### 2. Handler Function Pattern

#### Design Philosophy
Moved from class-based controllers to functional handlers with factory pattern:

```typescript
export const createUserHandler = (deps: UserControllerDeps) =>
  createHandler(
    {
      body: createUserSchema,
      response: createUserResponseSchema,
    },
    async ({ body, logger }) => {
      // Handler logic
      return ApiResult.success(user);
    }
  );
```

#### Key Features
1. **Schema-first validation**: Zod schemas define contracts
2. **Type inference**: Types derived from schemas
3. **Response validation**: Optional but recommended for critical endpoints
4. **Structured logging**: Request-scoped logger injected
5. **Consistent error handling**: Through createHandler wrapper

#### Handler Architecture
- One file per endpoint (e.g., `createUser.ts`, `getUser.ts`)
- Exports handler factory function
- Includes request/response schemas
- Clear separation of validation and business logic

### 3. Test-Driven Development Approach

#### Testing Philosophy
Adopted strict TDD with comprehensive test coverage BEFORE implementation:

1. **Write tests first**: Complete test file for each endpoint
2. **Test categories**:
   - Success cases (minimal and complete)
   - Validation errors (all edge cases)
   - Business logic errors (404, 409, etc.)
   - System behavior (headers, error format)
   - Database error handling

#### Test Structure
```typescript
describe('POST /users', () => {
  let app: Application;
  let db: Database;

  beforeAll(async () => {
    const res = await initializeTestApplication();
    app = res.app;
    db = res.db;
  });

  beforeEach(async () => {
    await db.delete(users);  // Clean state
  });

  // Comprehensive test cases...
});
```

#### Test Utilities
Created `initializeTestApplication()` for consistent test setup:
- Initializes test database with migrations
- Sets up dependency injection
- Creates Express app
- Returns app and database handles

## Implementation Details

### User Management System

Implemented full CRUD operations as reference:

1. **POST /users** - Create user
   - Email uniqueness validation
   - Role assignment
   - Name to username mapping

2. **GET /users/:id** - Get single user
   - UUID validation
   - 404 handling

3. **GET /users** - List users
   - Pagination with metadata
   - Role filtering
   - Consistent ordering

4. **PATCH /users/:id** - Update user
   - Partial updates
   - Email conflict checking
   - Field mapping (name → username)

5. **DELETE /users/:id** - Delete user
   - Soft delete capability
   - Idempotency

### Response Patterns

#### Pagination Response
```typescript
ApiResult.paginated(items, { page, limit, total })
```
Returns:
```json
{
  "success": true,
  "data": [...],  // Direct array, not wrapped
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

#### Error Response
Consistent format across all errors:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email already in use",
    "details": {
      "field": "email",
      "value": "test@example.com"
    }
  }
}
```

### Service Layer Pattern

Services encapsulate business logic with clean interfaces:
```typescript
interface UserServiceDeps {
  db: Database;  // Changed from PostgresJsDatabase<any>
}

export class UserService {
  constructor(private readonly deps: UserServiceDeps) {}
  
  // CRUD methods with proper typing
}
```

## Patterns Established

### 1. File Organization
```
src/
├── handlers/
│   └── users/
│       ├── createUser.ts    # One handler per file
│       ├── getUser.ts
│       ├── listUsers.ts
│       ├── updateUser.ts
│       ├── deleteUser.ts
│       ├── deps.ts          # Dependencies interface
│       ├── schemas.ts       # Shared schemas
│       └── index.ts         # Exports
├── services/
│   └── user.service.ts      # Business logic
└── routes/
    └── user.routes.ts       # Route definitions
```

### 2. Validation Patterns
- **Query params**: Use `.coerce` for type conversion
- **UUIDs**: Always validate with `.uuid()`
- **Pagination**: Default values, max limits
- **Optional fields**: Explicit `.optional()`

### 3. Error Handling
- Standardized error classes from `@skelly/utils`
- Contextual error information
- Proper HTTP status codes
- Never expose internal errors

### 4. Testing Patterns
- One test file per endpoint
- ~10-15 test cases per endpoint
- Clean database state before each test
- Test both success and failure paths
- Verify side effects

## Documentation Created

### 1. API Feature Development Guide (`/apps/api/CLAUDE.md`)
Comprehensive guide covering:
- Planning phase with endpoint design
- Test-first development approach
- Implementation steps
- Checklists and best practices
- Common pitfalls to avoid

### 2. Pattern Reference (`/apps/api/src/CLAUDE.md`)
Quick reference for:
- Current handler patterns
- Service patterns
- Route configuration
- Common validations
- Error handling

## Metrics and Outcomes

### Test Coverage
- 53 tests across 5 endpoint test files
- Average ~11 tests per endpoint
- 100% endpoint coverage for user management
- All edge cases covered

### Code Quality
- Type-safe from request to response
- No any types in business logic
- Consistent patterns across all endpoints
- Clear separation of concerns

### Developer Experience
- Hot reload in development
- Clear error messages
- Request ID tracking
- Comprehensive logging

## Lessons Learned

### 1. Test-First Development
Writing tests first:
- Clarifies requirements
- Catches edge cases early
- Provides living documentation
- Speeds up implementation

### 2. Functional Approach
Handler functions over classes:
- Easier to test
- More composable
- Better TypeScript inference
- Clearer dependencies

### 3. Schema Validation
Zod schemas provide:
- Single source of truth
- Runtime validation
- TypeScript types
- Documentation

### 4. Separation of Concerns
Clear boundaries between:
- HTTP layer (handlers)
- Business logic (services)
- Data access (Drizzle)
- Route definitions

## Next Steps

With these patterns established:
1. New features follow the same structure
2. Tests written before implementation
3. Consistent error handling and responses
4. Clear documentation for contributors

The user management implementation serves as the reference for all future API development, demonstrating best practices and establishing patterns that scale with the application.

## Summary

This ticket successfully:
- ✅ Established dependency injection pattern
- ✅ Created functional handler pattern with validation
- ✅ Implemented comprehensive test-driven development
- ✅ Built complete user management system
- ✅ Created 53 tests with full coverage
- ✅ Documented patterns for future development
- ✅ Set up development workflow with hot reload
- ✅ Established consistent error handling
- ✅ Created reference implementation for future features

The API is now ready for rapid feature development with established patterns that ensure quality, consistency, and maintainability.