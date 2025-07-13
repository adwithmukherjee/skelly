# Initialize packages/utils Design Decisions

This document tracks the design decisions made during TICKET-005: Initialize packages/utils.

## Planning & Design Decisions

### Package Purpose
The utils package will provide shared utilities that all apps and packages can use, focusing on:
1. **Logging** - Structured logging with Winston
2. **Environment Validation** - Type-safe env vars with Zod
3. **Error Handling** - Custom error classes and utilities
4. **HTTP Client** - Fetch wrapper with retries and error handling

### Design Principles
1. **Zero Dependencies on Other Packages** - Utils should be the lowest level package
2. **Type Safety** - Everything should be fully typed
3. **Tree Shakeable** - Each utility should be independently importable
4. **Environment Agnostic** - Should work in Node.js and browser where applicable

## Utility Design Plans

### 1. Logger (logger.ts)
**Design Decisions:**
- Use Winston for flexible logging with multiple transports
- Support different log levels (error, warn, info, http, verbose, debug, silly)
- Include context enrichment (request ID, user ID, service name)
- Console transport with colors in development, JSON in production
- File transport option for production
- Child logger support for service-specific logging

**Configuration:**
- Log level from ENV (LOG_LEVEL)
- Format based on NODE_ENV (pretty in dev, JSON in prod)
- Metadata support for structured logging
- Error serialization with stack traces
- Timestamp formatting

### 2. Environment Validation (env.ts)
**Design Decisions:**
- Use Zod for runtime validation and TypeScript inference
- Single source of truth for all env vars
- Fail fast on startup if required vars missing
- Support defaults for optional vars
- Type-safe access throughout codebase

**Structure:**
```typescript
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.string().transform(Number).default('3000'),
  DATABASE_URL: z.string().url(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  // etc...
});

export const env = envSchema.parse(process.env);
```

### 3. Error Classes (error.ts)
**Design Decisions:**
- Implement hybrid error architecture (see docs/design/error-handling-patterns.md)
- Base error classes in utils package
- Domain-specific errors in respective packages/services
- Include error codes for client handling
- Serializable for API responses
- Stack trace handling for debugging
- Integration with logger for automatic error logging

**Base Error Types (in utils):**
- `AppError` - Base class with code, message, statusCode, isOperational flag
- `ValidationError` - For input validation failures (400)
- `AuthenticationError` - For auth failures (401)
- `AuthorizationError` - For permission failures (403)
- `NotFoundError` - For missing resources (404)
- `ConflictError` - For duplicate resources (409)
- `RateLimitError` - For rate limiting (429)
- `ExternalServiceError` - For third-party failures (502)

**Architecture Note:**
Domain-specific errors will be defined in their respective packages by extending these base classes. This provides consistency while maintaining proper separation of concerns.

### 4. HTTP Client (http.ts)
**Design Decisions:**
- Wrapper around native fetch
- Automatic retries with exponential backoff
- Request/response interceptors
- Timeout support
- Error transformation to our error types
- JSON parsing with error handling
- Winston logging integration

**Features:**
- Configurable retry logic (3 attempts by default)
- Request timing and logging
- Automatic error type detection based on status codes
- Support for different content types
- Request cancellation via AbortController
- Query string builder for GET requests

## Testing Strategy
- Unit tests for each utility using Vitest
- Mock external dependencies (fetch, console)
- Test error scenarios and edge cases
- Verify TypeScript types with type tests
- Test logger outputs and formats
- Validate env schema behavior

## Package Structure
```
packages/utils/
├── src/
│   ├── logger.ts       # Winston logger setup
│   ├── env.ts          # Environment validation
│   ├── error.ts        # Error classes
│   ├── http.ts         # HTTP client
│   ├── index.ts        # Barrel exports
│   └── __tests__/      # Test files
├── package.json
├── tsconfig.json
└── claude.md           # AI guidance
```

## Dependencies
- `winston` - Flexible logger with transports
- `zod` - Schema validation
- Development: `vitest`, `@types/node`

## Implementation Progress

### Logger Implementation
- **Decision**: Created Winston logger with environment-aware formatting
- **Features**:
  - Pretty console output with colors in development
  - JSON output in production for log aggregation
  - Child logger support for service isolation
  - Express middleware for HTTP request logging
  - Metadata support for structured logging
- **Rationale**: Provides flexibility while maintaining performance

### Environment Validation Implementation
- **Decision**: Comprehensive env schema with sensible defaults
- **Features**:
  - Cached validation results for performance
  - Clear error messages for missing/invalid vars
  - Type-safe access with autocomplete
  - Helper function for required vars
- **Included Variables**:
  - Core: NODE_ENV, LOG_LEVEL, PORT
  - Database: DATABASE_URL, REDIS_URL
  - Auth: JWT_SECRET, JWT_EXPIRES_IN
  - AWS: AWS_REGION, AWS_ACCESS_KEY_ID, etc.
  - API: CORS_ORIGIN, API_BASE_URL

### Error Classes Implementation
- **Decision**: Implemented base error classes following hybrid architecture
- **Features**:
  - AppError base class with isOperational flag
  - HTTP status code specific errors
  - Error serialization for API responses
  - Automatic logging for non-operational errors
  - Express error handler middleware
- **Key Design**: Domain-specific errors extend these base classes

### HTTP Client Implementation
- **Decision**: Created fetch wrapper with enterprise features
- **Features**:
  - Configurable base URL and default headers
  - Automatic retries with exponential backoff
  - Request timeout support
  - Error transformation to AppError types
  - Request/response logging
  - Query parameter builder
  - Convenience methods for all HTTP verbs
- **Rationale**: Provides consistent HTTP communication with proper error handling

## Testing Implementation
- Created unit tests for error classes
- Created validation tests for env module
- Test coverage for edge cases and error scenarios

## Pattern Documentation
- Created claude.md with utility patterns
- Documented when to add new utilities
- Provided examples for common utility categories

## Summary

Successfully initialized the @skelly/utils package with:
- ✅ Winston logger with environment-aware formatting
- ✅ Zod-based environment validation with type safety
- ✅ Base error classes following hybrid architecture
- ✅ HTTP client with retries and error handling
- ✅ Express middleware for logging and error handling
- ✅ Unit tests for core functionality
- ✅ Pattern documentation for future development
- ✅ Proper package.json with build scripts

The utils package provides a solid foundation of shared utilities that all other packages and applications can use. It maintains proper separation of concerns by focusing on infrastructure and generic utilities without any business logic.