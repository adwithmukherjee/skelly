# Types Package Pattern Guide

This document outlines patterns for adding new types to the @skelly/types package.

## File Organization

Each domain should have its own file:
- `user.ts` - User-related types
- `auth.ts` - Authentication and authorization types
- `events.ts` - Event-driven architecture types
- `common.ts` - Shared utility types
- `[domain].ts` - New domain-specific types

## Type Definition Patterns

### Entity Types
```typescript
export interface EntityName extends BaseEntity {
  // Required fields first
  requiredField: string;
  anotherRequired: number;
  
  // Optional fields last
  optionalField?: string;
  metadata?: Record<string, any>;
}
```

### Enum Patterns
```typescript
export enum EntityStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  PENDING = "pending"
}
```

### Payload Types
For each entity, create CRUD payload types:
```typescript
export interface EntityCreatePayload {
  // Only include fields that can be set on creation
}

export interface EntityUpdatePayload {
  // All fields optional for partial updates
}
```

### Event Types
For new events:
1. Add to EventType enum
2. Create specific event interface extending BaseEvent
3. Add to DomainEvent union type

## Best Practices

1. **Use string enums** for better debugging and serialization
2. **Extend BaseEntity** for database entities
3. **Keep types pure** - no implementation logic
4. **Document complex types** with JSDoc comments
5. **Export everything** from index.ts
6. **Version carefully** - breaking changes require major version bump

## Adding New Types

When adding types for a new feature:
1. Create a new file if it's a new domain
2. Follow the existing patterns
3. Update index.ts exports
4. Add basic type tests
5. Document any special considerations here