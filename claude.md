# 🧠 AI-Friendly Monorepo Codebase Specification

This document outlines the architectural patterns, folder structure, and conventions used in this monorepo to enable autonomous feature development by AI agents. The project is designed to support a full-stack platform with modular backend services, shared types, authentication, infrastructure, and queue processing.

## 📁 Project Structure

```
root/
├── apps/
│   ├── api/                # Express REST API server
│   ├── worker/             # Task queue consumer (e.g. SQS)
│   └── web/                # (Optional) Next.js frontend
│
├── packages/
│   ├── db/                 # Drizzle ORM schema & DB access
│   ├── types/              # Shared TypeScript types/interfaces
│   ├── auth/               # Authentication logic, JWT, middleware
│   └── utils/              # Common utilities, logging, validation
│
├── .env.example            # Template environment variables
├── docker-compose.yml      # Local dev infra (Postgres, SQS, etc)
└── turbo.json / nx.json    # Monorepo task orchestrator config
```

## 📦 Directory Responsibilities

### `apps/api/`

Handles all HTTP traffic and contains:

| Path               | Responsibility                                            |
| ------------------ | --------------------------------------------------------- |
| `src/routes/`      | Maps HTTP endpoints to controller functions               |
| `src/controllers/` | Request handlers; validates input, manages `req/res`      |
| `src/services/`    | Business logic and orchestration (e.g. DB access, queues) |
| `src/middleware/`  | Auth, request logging, error handling                     |
| `src/index.ts`     | Bootstraps and starts the Express app                     |
| `tests/`           | Unit tests for routes, controllers, services              |

#### Example: `apps/api/src/routes/user.ts`

```ts
router.post("/users", userController.createUser);
router.get("/users/:id", userController.getUser);
```

### `apps/worker/`

Long-running background worker (e.g. AWS SQS consumer):

| Path              | Responsibility                                 |
| ----------------- | ---------------------------------------------- |
| `src/handlers/`   | Task handlers keyed by message type            |
| `src/consumer.ts` | Reads from SQS and invokes appropriate handler |
| `src/index.ts`    | Bootstraps the worker runtime                  |
| `tests/`          | Tests for task handlers and error handling     |

### `apps/web/`

(Optional) Next.js frontend. Can access shared types and auth client.

### `packages/db/`

All PostgreSQL + Drizzle-related functionality:

| Path              | Responsibility                                   |
| ----------------- | ------------------------------------------------ |
| `src/models/`     | Drizzle schema files (1 per resource)            |
| `src/migrations/` | SQL or drizzle-kit-generated migrations          |
| `src/index.ts`    | Exports DB client + model registry               |
| `seed/`           | Seed script for dev/test data                    |
| `tests/`          | Unit tests for DB queries (in-memory or test DB) |

#### Example: `packages/db/src/models/user.ts`

```ts
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").unique().notNull(),
  // ...
});
```

### `packages/types/`

Centralized shared types between apps:

| File        | Description                   |
| ----------- | ----------------------------- |
| `user.ts`   | User, UserCreatePayload, etc  |
| `auth.ts`   | Role, JWTClaims, etc          |
| `events.ts` | Queue event payload contracts |

These types should be imported into API, web, worker, etc.

### `packages/auth/`

JWT-based authentication with role-based access control (RBAC):

| Path                | Description                                   |
| ------------------- | --------------------------------------------- |
| `src/middleware.ts` | requireAuth, requireRole("admin") middlewares |
| `src/jwt.ts`        | Encode/decode/validate JWT tokens             |
| `src/session.ts`    | Session management, token refresh logic       |

Tokens are typically stored as HTTP-only cookies or passed as headers.

### `packages/utils/`

Reusable helpers and infrastructure glue:

| Path        | Description                |
| ----------- | -------------------------- |
| `logger.ts` | Pino-based logger          |
| `env.ts`    | Validates env vars via Zod |
| `http.ts`   | Fetch client with retries  |
| `error.ts`  | Error classes and handlers |

## 🔄 API & Service Flow

A typical user-related feature like "Create User" would follow this flow:

1. **HTTP Request** → `POST /users`
2. **Route** (`routes/user.ts`) → Maps to controller
3. **Controller** (`controllers/userController.ts`) → Parses request and calls service
4. **Service** (`services/userService.ts`) → Contains business logic, calls DB
5. **DB Layer** (`packages/db`) → Performs query via Drizzle schema

## 🧪 Testing Strategy

| Layer       | Testing Approach                                  |
| ----------- | ------------------------------------------------- |
| Routes      | Integration tests (supertest)                     |
| Controllers | Unit tests with mocked services                   |
| Services    | Unit tests with mocked DB or queues               |
| DB Models   | Unit/integration tests with a test DB             |
| Workers     | Task handler tests with mock SQS payloads         |
| Auth/Utils  | Pure unit tests                                   |
| Types       | Type-level tests using tsd or internal assertions |

Use **vitest**, **jest**, or **uvu** depending on preference and performance needs.

### CI Pipeline

CI pipeline should include:

- Type check
- Lint
- Unit tests
- Format check (Prettier)

## 🛠️ Code Generation & Scaffold CLI

Use a CLI tool (custom or **plop**, **hygen**) to scaffold features:

```bash
yarn scaffold user
```

Should generate:

- `routes/user.ts`
- `controllers/userController.ts`
- `services/userService.ts`
- `db/models/user.ts`
- `types/user.ts`
- Tests for controller and service

This enables AI agents to generate new features autonomously using consistent conventions.

## 🧠 AI Agent Guidance

Agents should:

- Use existing models/types as references before creating new ones
- Add tests when creating new controllers/services
- Respect the domain boundaries (no DB access in controllers, etc)
- Register routes in `routes/index.ts`
- Register task handlers in `worker/src/handlers/index.ts`
- Document any new entities or routes in `feature-map.json` or similarf

## ✅ Feature Requirements Checklist

When creating a new resource (e.g. `Post`, `Project`, `Org`), ensure:

- [ ] REST routes exist
- [ ] Controller functions handle request parsing/validation
- [ ] Service functions contain logic and call DB or queues
- [ ] DB model is defined in `packages/db`
- [ ] Types are defined in `packages/types`
- [ ] Unit + integration tests exist
- [ ] All relevant indexes and foreign keys are defined in DB
- [ ] Feature is registered in `feature-map.json` (for agent awareness)
