# Route Handler Pattern Reference

This document provides a quick reference for the route handler patterns used in this API. For comprehensive feature development instructions, see `/apps/api/CLAUDE.md`.

## Current Architecture

The API uses a modular architecture with:
- **Handlers**: Individual files per endpoint with validation schemas
- **Services**: Business logic layer
- **Routes**: Route group definitions
- **Container**: Dependency injection setup

## Key Patterns

### Handler Pattern
Each handler exports a factory function (not a named export starting with `create`):

```typescript
// src/handlers/[resource]/createResource.ts
export const createResourceHandler = (deps: ResourceControllerDeps) =>
  createHandler(
    {
      body: createResourceSchema,
      response: responseSchema, // optional
    },
    async ({ body, logger }) => {
      const resource = await deps.resourceService.create(body);
      logger.info('Resource created', { resourceId: resource.id });
      return ApiResult.success(resource);
    }
  );
```

### Service Pattern
Services use the Database type from @skelly/db:

```typescript
import type { Database } from '@skelly/db';

interface ServiceDeps {
  db: Database;
}
```

### Route Configuration
Routes use a factory function that creates all handlers:

```typescript
export function createResourceRoutes(deps: ResourceControllerDeps): RouteGroup {
  const handlers = createResourceHandlers(deps);
  
  return {
    prefix: '/resources',
    description: 'Resource management endpoints',
    routes: [
      {
        method: 'get',
        path: '/',
        handler: handlers.listResources,
        description: 'List resources',
        tags: ['resources'],
      },
      // ... other routes
    ],
  };
}
```

### Pagination Response
For list endpoints, use `ApiResult.paginated()`:

```typescript
return ApiResult.paginated(items, { page, limit, total });
```

This returns data directly as an array with pagination metadata:
```json
{
  "success": true,
  "data": [...],
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

### Common Validation Patterns

Query parameters with coercion:
```typescript
export const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  role: z.enum(['user', 'admin']).optional(),
});
```

UUID validation:
```typescript
export const paramsSchema = z.object({
  id: z.string().uuid(),
});
```

### Error Handling
Use standardized error classes:
```typescript
import { NotFoundError, ValidationError } from '@skelly/utils';

// 404 - Resource not found
throw new NotFoundError('User', id);

// 400 - Validation error with context
throw new ValidationError('Email already in use', {
  field: 'email',
  value: email,
});
```

## Quick Reference

### File Locations
- **Handlers**: `src/handlers/[resource]/[action].ts`
- **Services**: `src/services/[resource].service.ts`
- **Routes**: `src/routes/[resource].routes.ts`
- **Tests**: `tests/[resource]/[action].test.ts`

### Container Updates
When adding a new resource:
1. Initialize service in `initializeContainer()`
2. Create getter function `get[Resource]Deps()`
3. Add to `getRouteGroups()` return object

### Testing
- Use `initializeTestApplication()` from `tests/utils.ts`
- Clean up data in `beforeEach`
- Test one endpoint per file

For detailed instructions on developing new features, including planning, testing, and implementation steps, see `/apps/api/CLAUDE.md`.