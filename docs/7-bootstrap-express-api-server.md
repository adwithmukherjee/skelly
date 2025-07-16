# TICKET-007: Bootstrap Express API Server

This document tracks the design decisions and implementation details for bootstrapping the Express API server.

## High-Level Approach & Design Decisions

### API Server Purpose
The API server will:
1. **Handle HTTP traffic** - RESTful API endpoints
2. **Integrate shared packages** - Use @skelly/db, @skelly/types, @skelly/utils, @skelly/auth
3. **Middleware pipeline** - Security, logging, error handling
4. **Modular architecture** - Routes, controllers, services pattern
5. **Development experience** - Hot reload, debugging support

### Technology Stack

#### Core Dependencies
- **Express** - Web framework (mature, extensive middleware ecosystem)
- **TypeScript** - Type safety and better DX
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Express Rate Limit** - Basic DDoS protection
- **Compression** - Response compression

#### Development Dependencies
- **Nodemon** - Auto-restart on file changes
- **tsx** - TypeScript execution without build step
- **@types/express** and related - Type definitions

### Architecture Design

#### Directory Structure
```
apps/api/
├── src/
│   ├── config/          # App configuration
│   │   └── index.ts     # Environment and app config
│   ├── middleware/      # Express middleware
│   │   ├── error.ts     # Error handling
│   │   ├── logging.ts   # Request logging
│   │   └── index.ts     # Middleware exports
│   ├── routes/          # Route definitions
│   │   ├── health.ts    # Health check endpoint
│   │   └── index.ts     # Route registration
│   ├── controllers/     # Request handlers (future)
│   ├── services/        # Business logic (future)
│   ├── app.ts          # Express app setup
│   └── index.ts        # Server entry point
├── tests/              # Test files
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript config
└── .env.example        # Environment variables template
```

### Configuration Strategy

#### Environment Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production/test)
- `LOG_LEVEL` - Logging verbosity
- `API_PREFIX` - API route prefix (default: /api/v1)

#### Configuration Module
- Centralized config using @skelly/utils env validation
- Type-safe environment access
- Default values for development

### Middleware Pipeline Order
1. **Helmet** - Security headers
2. **CORS** - Cross-origin configuration
3. **Compression** - Response compression
4. **Body Parser** - JSON/URL-encoded parsing
5. **Request ID** - Unique request tracking
6. **Logging** - Request/response logging
7. **Rate Limiting** - DDoS protection
8. **Routes** - API endpoints
9. **404 Handler** - Not found errors
10. **Error Handler** - Global error handling

### Error Handling Strategy
- Use @skelly/utils error classes
- Consistent error response format
- Proper HTTP status codes
- Request ID in error responses
- Stack traces only in development

### Logging Strategy
- Use @skelly/utils logger (Winston)
- Request/response logging middleware
- Structured logging with request IDs
- Performance metrics (response time)

### Build and Development

#### Development Mode
- Use nodemon with tsx for hot reload
- Source maps enabled
- Verbose logging
- Error stack traces

#### Production Build
- Compile TypeScript to JavaScript
- Optimize for performance
- Minimal logging
- No stack traces

### Testing Approach
- Supertest for integration tests
- Mock middleware for unit tests
- Test health endpoint
- Verify middleware order

## Implementation Plan

1. Create API app directory structure
2. Initialize package.json with dependencies
3. Configure TypeScript
4. Create Express app with basic middleware
5. Add health check endpoint
6. Set up error handling
7. Configure logging
8. Add development scripts
9. Test server startup
10. Document usage

## Confirmed Approach

Let's proceed with this Express API server setup focusing on:
- Clean separation of concerns
- Type safety throughout
- Proper error handling
- Good developer experience
- Foundation for future features

## Implementation Details

### Request-Scoped Logger
Implemented Winston child logger pattern for request tracking:
- Each request gets a unique ID via `req.id`
- Child logger created with `req.logger = logger.child({ requestId: req.id })`
- All logs within request lifecycle automatically include request ID
- Enables tracing all logs for a specific request

### Middleware Implementation
1. **Request ID & Logger** - Assigns unique ID and creates child logger
2. **Request Logger** - Logs request start/completion with timing
3. **Error Handler** - Centralized error handling with request context
4. **Not Found Handler** - 404 responses with request ID

### Health Check Endpoint
- Route: `GET /health`
- Checks database connectivity
- Returns service status and latency
- Includes request ID in headers

### Project Structure Created
```
apps/api/
├── src/
│   ├── config/          ✓ Environment configuration
│   ├── middleware/      ✓ Logging, error handling
│   ├── routes/          ✓ Health check, route registry
│   ├── app.ts          ✓ Express app setup
│   └── index.ts        ✓ Server entry point
├── tests/              ✓ Health check test
├── package.json        ✓ Dependencies configured
├── tsconfig.json       ✓ TypeScript config
├── nodemon.json        ✓ Development auto-reload
└── .env.example        ✓ Environment template
```

### Key Design Decisions Made
1. **Request-scoped logging** - Every log in request lifecycle includes request ID
2. **Graceful shutdown** - Proper cleanup on SIGTERM/SIGINT
3. **Error handling** - Consistent error format with request tracking
4. **Rate limiting** - Configurable based on environment
5. **Health checks** - Database connectivity verification

## Summary

Successfully bootstrapped the Express API server with:
- ✅ Express app with TypeScript configuration
- ✅ Security middleware (Helmet, CORS, rate limiting)
- ✅ Request tracking with unique IDs
- ✅ Request-scoped logging with Winston child loggers
- ✅ Centralized error handling
- ✅ Health check endpoint with database connectivity test
- ✅ Graceful shutdown handling
- ✅ Development setup with hot reload (nodemon + tsx)
- ✅ Integration test setup with Supertest
- ✅ Environment configuration with type safety

The API server is now ready to handle HTTP traffic and provides a solid foundation for building RESTful endpoints. The request-scoped logging ensures all logs can be traced back to specific requests, making debugging and monitoring much easier.