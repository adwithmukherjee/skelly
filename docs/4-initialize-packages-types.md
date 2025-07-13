# Initialize packages/types Design Decisions

This document tracks the design decisions made during TICKET-004: Initialize packages/types.

## Package Structure

### Initial Setup
- **Decision**: Create @skelly/types as a dedicated TypeScript types package
- **Rationale**: 
  - Centralizes all shared type definitions
  - Prevents circular dependencies between packages
  - Enables type-safe development across all apps
  - Single source of truth for data contracts

### TypeScript Configuration
- **Decision**: Extend root tsconfig with composite project references
- **Files Created**: 
  - `package.json` with build scripts
  - `tsconfig.json` with composite: true for project references
- **Rationale**:
  - Leverages TypeScript project references for faster builds
  - Generates declaration files for type consumption
  - Maintains consistency with monorepo configuration

## Type Definitions

### User Types (src/user.ts)
- **Decision**: Start with comprehensive user type definitions
- **Includes**:
  - User interface with all common properties
  - UserRole enum (user, admin, moderator)
  - Payload types for CRUD operations
  - Password reset and email verification payloads
- **Rationale**:
  - User management is core to most applications
  - Covers authentication and authorization needs
  - Provides clear contracts for API endpoints

### Auth Types (src/auth.ts)
- **Decision**: Create comprehensive JWT and session management types
- **Includes**:
  - JWTClaims interface with standard claims
  - Token types (access and refresh)
  - Session tracking interface
  - Permission and role-based access control types
- **Rationale**:
  - Standardizes authentication across all services
  - Supports stateless JWT with optional session tracking
  - Enables fine-grained RBAC implementation

### Event Types (src/events.ts)
- **Decision**: Implement event-driven architecture types
- **Includes**:
  - EventType enum for all domain events
  - BaseEvent interface with common properties
  - Specific event interfaces (UserRegistered, EmailSend, etc.)
  - QueueMessage wrapper for reliable processing
- **Rationale**:
  - Enables decoupled, event-driven communication
  - Supports async processing via queues (SQS)
  - Provides type safety for event handlers
  - Includes retry logic support

### Common Types (src/common.ts)
- **Decision**: Add utility types used across all services
- **Includes**:
  - Pagination types for list endpoints
  - Standard API response wrapper
  - Error structure with codes and details
  - Base entity types with timestamps
  - Health check response format
- **Rationale**:
  - Standardizes API responses across all endpoints
  - Provides consistent pagination patterns
  - Enables proper error handling
  - Supports soft deletion pattern

## Testing Setup

### Test Infrastructure
- **Decision**: Use Vitest for type testing
- **Implementation**: Created basic type compilation tests
- **Rationale**:
  - Ensures types compile correctly
  - Catches breaking changes early
  - Provides usage examples

## Pattern Documentation

### claude.md File
- **Decision**: Create package-specific AI guidance
- **Contents**:
  - File organization patterns
  - Type definition templates
  - Best practices for new types
  - Contribution guidelines
- **Rationale**:
  - Ensures consistent type definitions
  - Guides AI agents in future development
  - Documents domain-specific patterns

## Package Configuration

### Build Setup
- **Scripts**:
  - `build`: Compiles TypeScript to JavaScript
  - `typecheck`: Validates types without emitting
  - `test`: Runs type tests
  - `clean`: Removes build artifacts
- **Rationale**:
  - Supports both development and production builds
  - Enables CI/CD integration
  - Maintains clean working directory

## Summary

Successfully initialized the @skelly/types package with:
- ✅ TypeScript configuration with project references
- ✅ Comprehensive user type definitions
- ✅ JWT and authentication types
- ✅ Event-driven architecture types
- ✅ Common utility types (pagination, API responses, etc.)
- ✅ Basic test setup with Vitest
- ✅ Pattern documentation for future development
- ✅ Proper package.json with build scripts

The types package is now ready to be consumed by other packages and applications in the monorepo. All types are centralized, well-organized, and follow consistent patterns that will scale with the application.
