# API Integration Tests

Integration tests for the API server that verify endpoints work correctly with real dependencies.

## Dependencies

**Required**: PostgreSQL must be running at `DATABASE_URL` (default: `postgresql://postgres:password@localhost:5432/skelly_dev`)

```bash
# Start dependencies
npm run docker:start

# Run tests
npm test
```

## Writing Tests

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../src/app';
import { initializeContainer } from '../src/container';

describe('Feature', () => {
  let app: Application;

  beforeAll(() => {
    initializeContainer();
    app = createApp();
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  it('should work', async () => {
    const response = await request(app)
      .get('/endpoint')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: expect.any(Object),
    });
  });
});
```

## Best Practices

- **Test full request cycle** - middleware, validation, database operations
- **Clean up test data** - use afterEach/afterAll hooks
- **Test error cases** - 400s, 404s, 500s
- **Verify response format** - check entire response structure
- **Check headers** - ensure X-Request-Id is present

## Common Patterns

```typescript
// Test validation
it('should validate input', async () => {
  await request(app)
    .post('/users')
    .send({ email: 'invalid' })
    .expect(400);
});

// Test auth
it('should require auth', async () => {
  await request(app)
    .get('/protected')
    .expect(401);
});

// Test CRUD
it('should create resource', async () => {
  const res = await request(app)
    .post('/users')
    .send({ email: 'test@example.com' })
    .expect(201);
    
  expect(res.body.data.id).toBeDefined();
});
```

## Troubleshooting

- **Connection refused**: Ensure PostgreSQL is running with `docker-compose ps`
- **Port in use**: Stop other servers or change PORT
- **Test timeouts**: Add timeout to slow tests: `it('slow test', async () => {}, 10000)`
- **Constraint violations**: Clean up test data properly