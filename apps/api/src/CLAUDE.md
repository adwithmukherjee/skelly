# Route Handler Pattern - Implementation Guide

This guide provides step-by-step instructions for implementing the modular route handler pattern used in this API. This pattern promotes maintainability, testability, and type safety through dependency injection and separation of concerns.

## Pattern Overview

The pattern consists of:
- **Individual Handler Files**: Each route handler in its own file with schemas, types, and factory functions
- **Dependency Injection**: Services and dependencies injected through a container
- **Type Safety**: Zod schemas for validation with TypeScript type inference
- **Modular Organization**: Clear separation between handlers, services, routes, and dependencies

## Step-by-Step Implementation

### 1. Create the Service Layer

First, create a service class that handles business logic:

```typescript
// src/services/[resource].service.ts
import { Database } from '@skelly/db';

interface ResourceServiceDeps {
  db: Database;
}

export class ResourceService {
  constructor(private readonly deps: ResourceServiceDeps) {}

  async findById(id: string): Promise<Resource | null> {
    // Implementation
  }

  async create(data: NewResource): Promise<Resource> {
    // Implementation
  }

  async list(options: ListOptions): Promise<{ items: Resource[]; total: number }> {
    // Implementation
  }

  // Add other CRUD methods as needed
}
```

### 2. Define Dependencies Interface

Create a dependencies interface for your controller:

```typescript
// src/handlers/[resource]/deps.ts
import { ResourceService } from '../../services/resource.service';

export interface ResourceControllerDeps {
  resourceService: ResourceService;
  // Add other dependencies as needed
}
```

### 3. Create Individual Handler Files

Create a separate file for each route handler:

```typescript
// src/handlers/[resource]/createResource.ts
import { z } from 'zod';
import { ValidationError } from '@skelly/utils';
import { createHandler, ApiResult } from '../../core';
import { ResourceControllerDeps } from './deps';

// 1. Define Zod schema for validation
export const createResourceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  // Add other fields
});

// 2. Infer TypeScript type from schema
export type CreateResourceBody = z.infer<typeof createResourceSchema>;

// 3. Optional: Define response schema for validation
export const createResourceResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreateResourceResponse = z.infer<typeof createResourceResponseSchema>;

// 4. Create handler factory function
export function createCreateResourceHandler(deps: ResourceControllerDeps) {
  return createHandler(
    {
      body: createResourceSchema, // Request validation
      response: createResourceResponseSchema, // Optional response validation
    },
    async ({ body, logger }) => {
      // Business logic
      const resource = await deps.resourceService.create(body);
      
      logger.info('Resource created', { resourceId: resource.id });
      
      return ApiResult.success(resource);
    }
  );
}
```

**Handler with URL Parameters:**

```typescript
// src/handlers/[resource]/getResource.ts
import { z } from 'zod';
import { NotFoundError } from '@skelly/utils';
import { createHandler, ApiResult } from '../../core';
import { ResourceControllerDeps } from './deps';

export const getResourceSchema = z.object({
  id: z.string().uuid(),
});

export type GetResourceParams = z.infer<typeof getResourceSchema>;

export function createGetResourceHandler(deps: ResourceControllerDeps) {
  return createHandler(
    {
      params: getResourceSchema,
    },
    async ({ params, logger }) => {
      const resource = await deps.resourceService.findById(params.id);
      
      if (!resource) {
        throw new NotFoundError('Resource', params.id);
      }
      
      return ApiResult.success(resource);
    }
  );
}
```

**Handler with Query Parameters:**

```typescript
// src/handlers/[resource]/listResources.ts
import { z } from 'zod';
import { createHandler, ApiResult } from '../../core';
import { ResourceControllerDeps } from './deps';

export const listResourcesSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  category: z.string().optional(),
});

export type ListResourcesQuery = z.infer<typeof listResourcesSchema>;

export function createListResourcesHandler(deps: ResourceControllerDeps) {
  return createHandler(
    {
      query: listResourcesSchema,
    },
    async ({ query, logger }) => {
      const offset = (query.page - 1) * query.limit;
      
      const result = await deps.resourceService.list({
        offset,
        limit: query.limit,
        category: query.category,
      });
      
      return ApiResult.success({
        items: result.items,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: result.total,
          pages: Math.ceil(result.total / query.limit),
        },
      });
    }
  );
}
```

### 4. Create Handler Index File

Export all handlers and types:

```typescript
// src/handlers/[resource]/index.ts

// Export individual handler creators
export { createListResourcesHandler } from './listResources';
export { createGetResourceHandler } from './getResource';
export { createCreateResourceHandler } from './createResource';
export { createUpdateResourceHandler } from './updateResource';
export { createDeleteResourceHandler } from './deleteResource';

// Export dependencies and types
export type { ResourceControllerDeps } from './deps';

// Re-export schemas and types for convenience
export * from './listResources';
export * from './getResource';
export * from './createResource';
export * from './updateResource';
export * from './deleteResource';
```

### 5. Create Route Configuration

Define your routes using the handlers:

```typescript
// src/routes/[resource].routes.ts
import { RouteGroup } from '../core';
import {
  createListResourcesHandler,
  createGetResourceHandler,
  createCreateResourceHandler,
  createUpdateResourceHandler,
  createDeleteResourceHandler,
  ResourceControllerDeps,
} from '../handlers/resources';

export function createResourceRoutes(deps: ResourceControllerDeps): RouteGroup {
  const handlers = {
    listResources: createListResourcesHandler(deps),
    getResource: createGetResourceHandler(deps),
    createResource: createCreateResourceHandler(deps),
    updateResource: createUpdateResourceHandler(deps),
    deleteResource: createDeleteResourceHandler(deps),
  };

  return {
    prefix: '/resources',
    description: 'Resource management endpoints',
    routes: [
      {
        method: 'get',
        path: '/',
        handler: handlers.listResources,
        description: 'List all resources with pagination and filtering',
        tags: ['resources'],
      },
      {
        method: 'get',
        path: '/:id',
        handler: handlers.getResource,
        description: 'Get a specific resource by ID',
        tags: ['resources'],
      },
      {
        method: 'post',
        path: '/',
        handler: handlers.createResource,
        description: 'Create a new resource',
        tags: ['resources'],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: handlers.updateResource,
        description: 'Update an existing resource',
        tags: ['resources'],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: handlers.deleteResource,
        description: 'Delete a resource',
        tags: ['resources'],
      },
    ],
  };
}
```

### 6. Update Dependency Container

Add your new service and dependencies to the container:

```typescript
// src/container.ts
import { ResourceService } from './services/resource.service';
import { ResourceControllerDeps } from './handlers/resources';

// Services
let resourceService: ResourceService;

// Dependencies
let resourceDeps: ResourceControllerDeps;

export function initializeContainer(): void {
  // Initialize services
  resourceService = new ResourceService({
    db: getDatabaseClient(),
  });

  // Initialize dependencies
  resourceDeps = {
    resourceService,
  };
}

export function getResourceDeps(): ResourceControllerDeps {
  if (!resourceDeps) {
    throw new Error('Container not initialized. Call initializeContainer() first.');
  }
  return resourceDeps;
}

// Update the route groups function
export function getRouteGroups() {
  return {
    // ... existing deps
    resourceDeps: getResourceDeps(),
  };
}
```

### 7. Register Routes in Main App

Register your routes in the main application:

```typescript
// src/routes/index.ts
import { createResourceRoutes } from './resource.routes';

export function registerRoutes(app: Express, deps: AllDeps) {
  // ... existing routes
  
  const resourceRoutes = createResourceRoutes(deps.resourceDeps);
  app.use(resourceRoutes.prefix, ...resourceRoutes.routes);
}
```

## Response Schema Validation

The `createHandler` function supports optional response schema validation to ensure API contracts are maintained:

### How It Works

1. **Define a response schema** (optional):
   ```typescript
   export const userResponseSchema = z.object({
     id: z.string().uuid(),
     email: z.string().email(),
     name: z.string(),
     role: z.enum(['user', 'admin']),
     createdAt: z.date(),
     updatedAt: z.date(),
   });
   ```

2. **Add to handler options**:
   ```typescript
   return createHandler(
     {
       params: getUserSchema,
       response: userResponseSchema, // Optional response validation
     },
     async ({ params }) => {
       const user = await userService.findById(params.id);
       return ApiResult.success(user); // Validated against schema
     }
   );
   ```

### Validation Behavior

- **Development**: Throws errors if response doesn't match schema
- **Production**: Logs warnings but doesn't break the API
- **TypeScript**: Provides type inference for handler return values

### When to Use Response Schemas

**Use response schemas for:**
- Public API endpoints
- Critical business operations
- Endpoints with strict contracts
- Integration points with external systems

**Skip response schemas for:**
- Internal admin endpoints
- Rapidly evolving features
- Debug/diagnostic endpoints

### Example: With and Without Response Validation

```typescript
// With response validation - strict but safe
export function createStrictHandler(deps: Deps) {
  return createHandler(
    {
      query: querySchema,
      response: responseSchema, // Enforces response structure
    },
    async ({ query }) => {
      const data = await deps.service.getData(query);
      return ApiResult.success(data); // Must match responseSchema
    }
  );
}

// Without response validation - flexible
export function createFlexibleHandler(deps: Deps) {
  return createHandler(
    {
      query: querySchema,
      // No response schema - more flexible
    },
    async ({ query }) => {
      const data = await deps.service.getData(query);
      return ApiResult.success(data); // Any shape allowed
    }
  );
}
```

## Best Practices

### Validation Schemas

1. **Use Zod for all input validation**:
   ```typescript
   export const schema = z.object({
     email: z.string().email(),
     age: z.number().min(0).max(120),
     role: z.enum(['user', 'admin']),
   });
   ```

2. **Use coercion for query parameters**:
   ```typescript
   export const querySchema = z.object({
     page: z.coerce.number().min(1).default(1),
     active: z.coerce.boolean().optional(),
   });
   ```

3. **Share common schemas**:
   ```typescript
   // Create a schemas.ts file for reusable schemas
   // src/handlers/users/schemas.ts
   export const userSchema = z.object({
     id: z.string().uuid(),
     email: z.string().email(),
     username: z.string().nullable(),
     role: z.enum(['user', 'admin', 'moderator']),
     createdAt: z.date(),
     updatedAt: z.date(),
   });

   // Public schema without sensitive fields
   export const publicUserSchema = userSchema.omit({
     passwordHash: true,
   });

   // Import and use in handlers
   import { userSchema, publicUserSchema } from './schemas';
   
   export const getUserResponseSchema = userSchema; // Full schema
   export const getPublicUserResponseSchema = publicUserSchema; // Safe for public APIs
   ```

### Error Handling

Use standardized error classes:

```typescript
import { NotFoundError, ValidationError, ConflictError } from '@skelly/utils';

// Not found
throw new NotFoundError('User', id);

// Validation error
throw new ValidationError('Email already exists', {
  field: 'email',
  value: email,
});

// Business rule violation
throw new ConflictError('Cannot delete user with active orders');
```

### Logging

Include structured logging in handlers:

```typescript
logger.info('Operation completed', {
  userId: user.id,
  operation: 'create',
  metadata: { /* relevant data */ },
});
```

### Testing

Test handlers in isolation:

```typescript
// tests/handlers/resource.test.ts
import { createCreateResourceHandler } from '../src/handlers/resources';

describe('createResource handler', () => {
  it('should create resource successfully', async () => {
    const mockDeps = {
      resourceService: {
        create: jest.fn().mockResolvedValue(mockResource),
      },
    };
    
    const handler = createCreateResourceHandler(mockDeps);
    // Test implementation
  });
});
```

## File Structure Example

```
src/
├── handlers/
│   └── resources/
│       ├── index.ts              # Exports
│       ├── deps.ts               # Dependencies interface
│       ├── listResources.ts      # GET /resources
│       ├── getResource.ts        # GET /resources/:id
│       ├── createResource.ts     # POST /resources
│       ├── updateResource.ts     # PATCH /resources/:id
│       └── deleteResource.ts     # DELETE /resources/:id
├── services/
│   └── resource.service.ts       # Business logic
├── routes/
│   └── resource.routes.ts        # Route configuration
└── container.ts                  # Dependency injection
```

## Benefits of This Pattern

1. **Single Responsibility**: Each file handles one specific route
2. **Type Safety**: Full TypeScript coverage with Zod validation
3. **Testability**: Easy to mock dependencies and test handlers in isolation
4. **Maintainability**: Clear organization makes code easy to find and modify
5. **Reusability**: Shared schemas and consistent patterns across handlers
6. **Dependency Injection**: Services are easily mockable and replaceable
