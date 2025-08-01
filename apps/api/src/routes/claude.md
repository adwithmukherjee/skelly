# Route Pattern Guide

Routes define API endpoints and connect them to controller methods.

## Route File Structure

```typescript
import { RouteGroup } from '../core';
import { ResourceController, createResourceSchema, updateResourceSchema } from '../controllers/resource.controller';

export function createResourceRoutes(controller: ResourceController): RouteGroup {
  return {
    prefix: '/resources',
    description: 'Resource management endpoints',
    routes: [
      {
        method: 'get',
        path: '/',
        handler: controller.listResources,
        description: 'List all resources with pagination',
        tags: ['resources'],
      },
      {
        method: 'get',
        path: '/:id',
        handler: controller.getResource,
        validation: {
          params: z.object({ id: z.string().uuid() }),
        },
        description: 'Get a specific resource by ID',
        tags: ['resources'],
      },
      {
        method: 'post',
        path: '/',
        handler: controller.createResource,
        validation: {
          body: createResourceSchema,
        },
        description: 'Create a new resource',
        tags: ['resources'],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: controller.updateResource,
        validation: {
          params: z.object({ id: z.string().uuid() }),
          body: updateResourceSchema,
        },
        middleware: [requireAuth], // Add route-specific middleware
        description: 'Update an existing resource',
        tags: ['resources', 'auth-required'],
      },
    ],
  };
}
```

## Key Patterns

1. **Factory Function** - Export a function that accepts controller instance
2. **Return RouteGroup** - Includes prefix and route definitions
3. **Import Validation Schemas** - Reuse schemas from controller file
4. **Add Descriptions** - Document each endpoint's purpose
5. **Use Tags** - Categorize endpoints for documentation
6. **Add Validation** - Specify body, query, and params validation
7. **Route-Specific Middleware** - Add auth, rate limiting per route

## Registration

Routes are registered in `src/routes/index.ts`:

```typescript
const routeGroups = [
  createHealthRoutes(healthController),
  createUserRoutes(userController),
  createResourceRoutes(resourceController), // Add new route group
];
```

## Route Definition Fields

- **method**: 'get' | 'post' | 'put' | 'patch' | 'delete'
- **path**: Express route path (supports params like :id)
- **handler**: Controller method reference
- **validation**: Optional Zod schemas for body/query/params
- **middleware**: Optional array of route-specific middleware
- **description**: Human-readable endpoint description
- **tags**: Array of tags for categorization