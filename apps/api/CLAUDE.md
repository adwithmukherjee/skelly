# API Feature Development Guide

This guide provides comprehensive instructions for contributing new features to the Skelly API. Follow this structured approach to ensure consistency, maintainability, and quality across all API endpoints.

## Overview

The Skelly API follows a modular, test-driven development approach with clear separation of concerns:
- **Handlers**: Request handling and validation
- **Services**: Business logic
- **Routes**: Endpoint definitions
- **Tests**: Comprehensive test coverage

## 🚀 Feature Development Process

### 1. PLAN - Design Your Feature

Before writing any code, thoroughly plan your feature:

#### 1.1 Define the Feature Scope
```markdown
## Feature: [Feature Name]

### Description
[Detailed description of what the feature does]

### Business Requirements
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] ...

### Technical Requirements
- [ ] Data models needed
- [ ] Permissions/roles required
- [ ] External service integrations
```

#### 1.2 Design API Endpoints
For each endpoint, document:
```markdown
### Endpoint: [HTTP Method] /path/:param

**Purpose**: [What this endpoint does]

**Request**:
- Path params: `id` (UUID)
- Query params: `page`, `limit`, `filter`
- Body:
  ```json
  {
    "field1": "string",
    "field2": number
  }
  ```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "field1": "string",
    "field2": number
  }
}
```

**Error Cases**:
- 400: Invalid input
- 404: Resource not found
- 409: Conflict (e.g., duplicate)
- 500: Server error
```

#### 1.3 Example Feature Plan
```markdown
## Feature: Project Management

### Endpoints:
1. POST /projects - Create a new project
2. GET /projects - List all projects (with pagination)
3. GET /projects/:id - Get project details
4. PATCH /projects/:id - Update project
5. DELETE /projects/:id - Delete project
6. POST /projects/:id/members - Add member to project
7. DELETE /projects/:id/members/:userId - Remove member from project
```

### 2. TEST - Write Comprehensive Tests First

**IMPORTANT**: Write tests BEFORE implementing the endpoints. This ensures you've thought through all edge cases and have a clear specification.

#### 2.1 Test Structure
Create one test file per endpoint in `tests/[resource]/[action].test.ts`:

```
tests/
└── projects/
    ├── createProject.test.ts
    ├── getProject.test.ts
    ├── listProjects.test.ts
    ├── updateProject.test.ts
    ├── deleteProject.test.ts
    ├── addProjectMember.test.ts
    └── removeProjectMember.test.ts
```

#### 2.2 Test Template
Use this template for each endpoint test:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Application } from 'express';
import { Database } from '@skelly/db';
import { projects, users } from '@skelly/db';
import { eq } from 'drizzle-orm';
import { initializeTestApplication } from '../utils';

describe('[HTTP_METHOD] /resource/:id', () => {
  let app: Application;
  let db: Database;

  beforeAll(async () => {
    const res = await initializeTestApplication();
    app = res.app;
    db = res.db;
  });

  beforeEach(async () => {
    // Clean up tables before each test
    await db.delete(projects);
    await db.delete(users);
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  // Test cases...
});
```

#### 2.3 Required Test Cases
For each endpoint, include these test categories:

##### Success Cases
- Valid input with all fields
- Valid input with minimal required fields
- Different user roles (if applicable)

##### Validation Errors
- Missing required fields
- Invalid field formats
- Invalid field values (too long, wrong type, etc.)
- Invalid UUID formats

##### Business Logic Errors
- Resource not found (404)
- Duplicate resources (409)
- Permission denied (403)
- Business rule violations

##### Edge Cases
- Empty strings vs null values
- Maximum length inputs
- Special characters
- Concurrent operations
- Pagination edge cases

##### System Behavior
- Request ID header present
- Proper error response format
- Database error handling

#### 2.4 Example Test File
See `tests/users/createUser.test.ts` for a complete example with all test categories.

### 3. IMPLEMENT - Build One Endpoint at a Time

**IMPORTANT**: Implement and test one endpoint completely before moving to the next.

#### 3.1 Implementation Order
For each endpoint:
1. Create/update the service method
2. Create the handler with validation schemas
3. Add the route definition
4. Run tests and fix until all pass
5. Only then move to the next endpoint

#### 3.2 Repository & Service Layers

The API uses a clean separation between data access (repositories) and business logic (services):

##### Repository Layer (Data Access)
Repositories handle all data access, whether from the database or external APIs:

```typescript
// packages/repositories/src/database/project.repository.ts
import { DatabaseRepository } from '../base/database.repository';
import { Project, NewProject, projects } from '@skelly/db';
import { eq } from '@skelly/db';

export class ProjectRepository extends DatabaseRepository<Project> {
  async findById(id: string): Promise<Project | null> {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    return project || null;
  }

  async create(data: NewProject): Promise<Project> {
    const [project] = await this.db
      .insert(projects)
      .values(data)
      .returning();
    return project;
  }

  // Only data access methods, no business logic
}
```

##### Service Layer (Business Logic)
Services contain business logic and orchestrate between repositories:

```typescript
// packages/services/src/project.service.ts
import { ProjectRepository } from '@skelly/repositories';
import { ValidationError } from '@skelly/utils';

interface ProjectServiceDeps {
  projectRepository: ProjectRepository;
  logger: Logger;
}

export class ProjectService {
  constructor(private deps: ProjectServiceDeps) {}

  async createProject(data: CreateProjectDto) {
    // Business validation
    const existing = await this.deps.projectRepository.findByName(data.name);
    if (existing) {
      throw new ValidationError('Project name already exists');
    }

    // Create via repository
    const project = await this.deps.projectRepository.create({
      name: data.name,
      description: data.description,
      ownerId: data.ownerId,
    });

    this.deps.logger.info('Project created', { projectId: project.id });

    // Return with domain events
    return {
      project,
      events: [{ type: 'project.created', payload: { projectId: project.id } }]
    };
  }
}
```

#### 3.3 Handler Implementation
Create individual handler files:

```typescript
// src/handlers/projects/createProject.ts
import { z } from 'zod';
import { ValidationError } from '@skelly/utils';
import { createHandler, ApiResult } from '../../core';
import { ProjectControllerDeps } from './deps';

// Validation schema
export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  ownerId: z.string().uuid(),
});

export type CreateProjectBody = z.infer<typeof createProjectSchema>;

// Response schema (optional but recommended)
export const createProjectResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  ownerId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Handler factory
export const createProjectHandler = (deps: ProjectControllerDeps) =>
  createHandler(
    {
      body: createProjectSchema,
      response: createProjectResponseSchema,
    },
    async ({ body, logger }) => {
      // Check for duplicates
      const existing = await deps.projectService.findByName(body.name);
      if (existing) {
        throw new ValidationError('Project name already exists', {
          field: 'name',
          value: body.name,
        });
      }

      // Create project
      const project = await deps.projectService.create(body);
      
      logger.info('Project created', { projectId: project.id });
      
      return ApiResult.success(project);
    }
  );
```

#### 3.4 Route Configuration
Add routes to the route definition:

```typescript
// src/routes/project.routes.ts
import { RouteGroup } from '../core';
import { createProjectHandlers, ProjectControllerDeps } from '../handlers/projects';

export function createProjectRoutes(deps: ProjectControllerDeps): RouteGroup {
  const handlers = createProjectHandlers(deps);

  return {
    prefix: '/projects',
    description: 'Project management endpoints',
    routes: [
      {
        method: 'get',
        path: '/',
        handler: handlers.listProjects,
        description: 'List all projects with pagination',
        tags: ['projects'],
      },
      {
        method: 'get',
        path: '/:id',
        handler: handlers.getProject,
        description: 'Get project by ID',
        tags: ['projects'],
      },
      {
        method: 'post',
        path: '/',
        handler: handlers.createProject,
        description: 'Create a new project',
        tags: ['projects'],
      },
      // Add other routes...
    ],
  };
}
```

#### 3.5 Dependency Injection
Update the container with repositories and services:

```typescript
// apps/api/src/container.ts
import { ProjectRepository } from '@skelly/repositories';
import { ProjectService } from '@skelly/services';
import { ProjectControllerDeps } from './handlers/projects';

let projectRepository: ProjectRepository;
let projectService: ProjectService;
let projectDeps: ProjectControllerDeps;

export async function initializeContainer(inputs?: { dbClient?: DbClient }) {
  const db = inputs?.dbClient ?? dbClient;

  // Initialize repositories
  projectRepository = new ProjectRepository(await db.get());

  // Initialize services with repositories
  projectService = new ProjectService({
    projectRepository,
    logger,
  });

  // Initialize handler dependencies
  projectDeps = {
    projectService,
  };
}

export function getProjectDeps(): ProjectControllerDeps {
  if (!projectDeps) {
    throw new Error('Container not initialized');
  }
  return projectDeps;
}
```

#### 3.6 Register Routes
Add to the main route registration:

```typescript
// src/routes/index.ts
import { createProjectRoutes } from './project.routes';

export function registerRoutes(app: Express) {
  const deps = getRouteGroups();
  
  // Register project routes
  const projectGroup = createProjectRoutes(deps.projectDeps);
  const projectRouter = createGroupRouter(projectGroup);
  app.use(projectGroup.prefix, projectRouter);
  
  // ... other routes
}
```

### 4. VERIFY - Run Tests After Each Endpoint

After implementing each endpoint:

```bash
# Run tests for the specific endpoint
npm test tests/projects/createProject.test.ts

# Run all tests for the resource
npm test tests/projects

# Run all API tests
npm test
```

Only proceed to the next endpoint when all tests pass!

## 📋 Checklist for Each Feature

Use this checklist to ensure you haven't missed anything:

### Planning
- [ ] Feature requirements documented
- [ ] All endpoints designed with request/response specs
- [ ] Error cases identified
- [ ] Database schema changes planned (if needed)

### Testing
- [ ] Test file created for each endpoint
- [ ] Success cases tested
- [ ] All validation errors tested
- [ ] Business logic errors tested
- [ ] Edge cases tested
- [ ] Request ID header verified

### Implementation
- [ ] Service methods implemented
- [ ] Validation schemas created
- [ ] Handler created with proper error handling
- [ ] Response schemas added (for critical endpoints)
- [ ] Routes configured
- [ ] Dependencies injected
- [ ] Routes registered

### Quality
- [ ] All tests passing
- [ ] Code follows existing patterns
- [ ] Proper logging added
- [ ] Error messages are helpful
- [ ] No console.log statements
- [ ] Types properly exported

## 🎯 Best Practices

### Validation
- Use Zod schemas for ALL input validation
- Use `.coerce` for query parameters
- Validate UUIDs with `.uuid()`
- Set reasonable min/max lengths for strings

### Error Handling
- Use standardized error classes from `@skelly/utils`
- Include helpful error messages
- Add context to errors (field, value)
- Never expose internal errors to users

### Testing
- Each test should be independent
- Clean up data in `beforeEach`
- Test one thing per test case
- Use descriptive test names
- Mock external services, not internal ones

### Code Organization
- One handler per file
- Group related handlers in folders
- Export types alongside implementations
- Keep business logic in services

### Performance
- Use database transactions for multi-step operations
- Add indexes for frequently queried fields
- Paginate list endpoints
- Limit query result sizes

## 🚨 Common Pitfalls to Avoid

1. **Writing code before tests** - Always write tests first
2. **Testing multiple endpoints at once** - Focus on one at a time
3. **Skipping edge cases** - They often reveal bugs
4. **Inconsistent error responses** - Use the standard format
5. **Missing validation** - Validate everything from users
6. **Forgetting pagination** - All list endpoints need it
7. **Not checking existing code** - Follow established patterns

## 📚 Examples and References

- **User endpoints**: Complete CRUD example with all patterns
- **Health endpoints**: Simple endpoints without database
- **Test utilities**: See `tests/utils.ts` for shared test setup
- **Error handling**: Check middleware/error.ts for patterns

## 🤝 Getting Help

If you're stuck:
1. Check existing implementations for similar patterns
2. Look at test files for usage examples
3. Review the error messages carefully
4. Ensure your tests accurately reflect requirements

Remember: A well-tested feature is a well-designed feature!