# Error Handling Patterns

This document outlines the error handling architecture and patterns used across the Skelly monorepo.

## Architecture Decision: Hybrid Error Definition

We use a hybrid approach for defining errors that balances consistency with flexibility:

### 1. Base Error Infrastructure (packages/utils)

The utils package provides:
- **Base error classes** that all errors extend from
- **Generic HTTP errors** common across all services
- **Error handling utilities** and middleware

```typescript
// packages/utils/src/error.ts
export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: any;
  isOperational: boolean;
}

// Generic HTTP errors
export class ValidationError extends AppError { }
export class AuthenticationError extends AppError { }
export class AuthorizationError extends AppError { }
export class NotFoundError extends AppError { }
export class ConflictError extends AppError { }
export class RateLimitError extends AppError { }
```

### 2. Package-Specific Errors

Each package defines its own domain-specific errors by extending base classes:

```typescript
// packages/db/src/errors.ts
import { AppError } from '@skelly/utils';

export class DatabaseError extends AppError {
  constructor(message: string, code: string, details?: any) {
    super(message, `DB_${code}`, 500, details);
  }
}

export class QueryTimeoutError extends DatabaseError { }
export class UniqueConstraintError extends DatabaseError { }
export class ConnectionPoolError extends DatabaseError { }
```

### 3. Service-Specific Errors

Applications define business logic errors:

```typescript
// apps/api/src/errors/user.errors.ts
import { AppError, ConflictError } from '@skelly/utils';

export class UserAlreadyExistsError extends ConflictError {
  constructor(email: string) {
    super('User with this email already exists', { email });
  }
}

export class InvalidPasswordError extends AppError {
  constructor() {
    super('Invalid password', 'INVALID_PASSWORD', 400);
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor(email: string) {
    super('Email not verified', 'EMAIL_NOT_VERIFIED', 403, { email });
  }
}
```

## Benefits of This Approach

1. **Separation of Concerns**: Infrastructure errors vs domain errors are clearly separated
2. **Flexibility**: Each service can define errors specific to its domain
3. **Consistency**: All errors inherit from common base classes
4. **Type Safety**: TypeScript ensures proper error handling
5. **Maintainability**: Easy to add new errors without modifying shared packages

## Error Naming Conventions

### Error Class Names
- End with `Error` suffix
- Use descriptive names that indicate the problem
- Examples: `UserNotFoundError`, `DatabaseConnectionError`

### Error Codes
- Use SCREAMING_SNAKE_CASE
- Prefix with domain/package identifier
- Examples: `USER_NOT_FOUND`, `DB_CONNECTION_FAILED`

### Status Codes
- Follow standard HTTP status code meanings
- 4xx for client errors
- 5xx for server errors
- Use specific codes (409 for conflicts, not generic 400)

## Error Handling Flow

```
1. Error Occurs
   ↓
2. Throw Domain-Specific Error
   ↓
3. Error Middleware Catches
   ↓
4. Transform to AppError (if needed)
   ↓
5. Log Error (if not operational)
   ↓
6. Send Error Response
```

## Best Practices

### 1. Always Throw Specific Errors
```typescript
// ❌ Bad
throw new Error('User not found');

// ✅ Good
throw new UserNotFoundError(userId);
```

### 2. Include Helpful Context
```typescript
// ❌ Bad
throw new ValidationError('Invalid input');

// ✅ Good
throw new ValidationError('Invalid email format', {
  field: 'email',
  value: email,
  pattern: EMAIL_REGEX.toString()
});
```

### 3. Use Operational Flag
- Set `isOperational = true` for expected errors (validation, not found)
- Set `isOperational = false` for unexpected errors (programming errors)
- Only log non-operational errors with full stack traces

### 4. Error Recovery
```typescript
try {
  await externalService.call();
} catch (error) {
  // Transform external errors to our error types
  throw new ExternalServiceError('PaymentGateway', error);
}
```

## Testing Errors

```typescript
// Test that correct errors are thrown
expect(() => service.getUser('invalid-id'))
  .toThrow(UserNotFoundError);

// Test error properties
try {
  await service.createUser(duplicateEmail);
} catch (error) {
  expect(error).toBeInstanceOf(UserAlreadyExistsError);
  expect(error.statusCode).toBe(409);
  expect(error.details.email).toBe(duplicateEmail);
}
```

## Client Error Handling

Clients should handle errors based on:
1. Status code for general handling
2. Error code for specific handling
3. Error details for user feedback

```typescript
try {
  await api.createUser(data);
} catch (error) {
  if (error.code === 'USER_ALREADY_EXISTS') {
    // Handle duplicate user
  } else if (error.statusCode === 400) {
    // Handle validation errors
  } else {
    // Handle unexpected errors
  }
}
```