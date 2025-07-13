# Utils Package Pattern Guide

This document outlines patterns for adding new utilities to the @skelly/utils package.

## Package Philosophy

The utils package should contain:
- **Generic utilities** used across multiple packages/apps
- **Infrastructure code** (logging, error handling, HTTP)
- **No business logic** - keep it domain-agnostic
- **Zero dependencies** on other @skelly packages

## Adding New Utilities

When adding a new utility, ask yourself:
1. Is this used by multiple packages/apps? If not, it belongs in the specific package
2. Is it domain-agnostic? Business logic belongs in services
3. Does it depend on other @skelly packages? If yes, reconsider the architecture

## Existing Patterns

### Logger Pattern
```typescript
// Create child loggers for services
const serviceLogger = createChildLogger('UserService', {
  userId: user.id
});

// Use structured logging
logger.info('Operation completed', {
  duration: 150,
  result: 'success'
});
```

### Error Pattern
```typescript
// Always throw specific errors
throw new ValidationError('Invalid email format', {
  field: 'email',
  value: email
});

// Domain errors extend base classes
class UserNotFoundError extends NotFoundError {
  constructor(userId: string) {
    super('User', userId);
  }
}
```

### HTTP Client Pattern
```typescript
// Create configured clients
const apiClient = new HttpClient({
  baseURL: 'https://api.example.com',
  headers: { 'API-Key': 'secret' }
});

// Use with proper error handling
try {
  const data = await apiClient.get('/users');
} catch (error) {
  if (isAppError(error) && error.statusCode === 404) {
    // Handle not found
  }
  throw error;
}
```

### Environment Pattern
```typescript
// Access validated env vars
import { env, requireEnv } from '@skelly/utils';

// Optional env var
const redisUrl = env.REDIS_URL;

// Required env var (throws if not set)
const jwtSecret = requireEnv('JWT_SECRET');
```

## Common Utilities to Add

Consider adding these utilities as needed:

### Date/Time Utilities
```typescript
// date.ts
export const formatDate = (date: Date, format: string): string => {};
export const parseDate = (dateString: string): Date => {};
export const addDays = (date: Date, days: number): Date => {};
```

### String Utilities
```typescript
// string.ts
export const slugify = (text: string): string => {};
export const truncate = (text: string, length: number): string => {};
export const capitalize = (text: string): string => {};
```

### Validation Utilities
```typescript
// validation.ts
export const isEmail = (email: string): boolean => {};
export const isUUID = (id: string): boolean => {};
export const sanitizeHtml = (html: string): string => {};
```

### Crypto Utilities
```typescript
// crypto.ts
export const hash = async (text: string): Promise<string> => {};
export const compare = async (text: string, hash: string): Promise<boolean> => {};
export const generateToken = (length: number): string => {};
```

## Testing Guidelines

Every utility must have tests that cover:
1. Happy path scenarios
2. Edge cases
3. Error conditions
4. Type safety

Example test structure:
```typescript
describe('utilityName', () => {
  it('should handle normal case', () => {});
  it('should handle edge case', () => {});
  it('should throw on invalid input', () => {});
});
```

## Performance Considerations

1. **Lazy Loading**: Import only what you need
2. **Caching**: Cache expensive computations (like env validation)
3. **Async by Default**: Make I/O operations async
4. **Tree Shaking**: Ensure utilities can be imported individually

## Don'ts

1. **Don't add framework-specific code** (Express types in parameters are OK for middleware)
2. **Don't add business logic** (user validation belongs in user service)
3. **Don't create circular dependencies** with other packages
4. **Don't add utilities used by only one service**