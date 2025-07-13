# Event-Driven Architecture Design

This document explains the event-driven architecture pattern used in the Skelly monorepo and how it facilitates communication between frontend (Next.js) and backend (Express) services.

## Overview

Our architecture uses events as the primary mechanism for communicating state changes and triggering side effects across the system. This creates a loosely coupled, scalable, and maintainable application.

## Communication Channels

### 1. Traditional REST API
- **Purpose**: Synchronous operations requiring immediate responses
- **Use Cases**: 
  - User authentication (login/logout)
  - Data fetching (GET requests)
  - Form submissions requiring validation feedback
- **Pattern**: Request → Response with status codes and data

### 2. WebSocket/Server-Sent Events (SSE)
- **Purpose**: Real-time event streaming from backend to frontend
- **Use Cases**:
  - Live notifications
  - Collaborative features
  - System status updates
  - Real-time data synchronization
- **Pattern**: Backend publishes events → Frontend subscribes and reacts

### 3. Event Emission from Frontend
- **Purpose**: Frontend-initiated events that trigger backend workflows
- **Use Cases**:
  - Complex operations with multiple side effects
  - Actions that need to notify other users
  - Analytics and tracking events
- **Pattern**: Frontend emits event → Backend processes asynchronously

## Event Flow Example: User Registration

```
1. Frontend                    2. Express API               3. Event Bus (SQS)
   │                              │                             │
   ├─POST /api/auth/register─────>│                             │
   │                              ├─Validate & Save User        │
   │                              ├─Publish USER_REGISTERED────>│
   │<────201 Created + User ID────┤                             │
   │                              │                             │
   │                              │                          4. Workers
   │                              │                             ├─Send Welcome Email
   │                              │                             ├─Initialize Preferences
   │                              │                             ├─Update Analytics
   │                              │                             │
   │<────WebSocket: USER_REGISTERED Event────────────────────────┘
   │
   └─Update UI with confirmation
```

## Implementation Patterns

### Backend Event Publishing

Events are published after successful database operations:

```typescript
// In Express service layer
async function createUser(data: UserCreatePayload): Promise<User> {
  const user = await db.insert(users).values(data);
  
  await eventBus.publish({
    type: EventType.USER_REGISTERED,
    data: {
      userId: user.id,
      email: user.email,
      requiresEmailVerification: true
    }
  });
  
  return user;
}
```

### Frontend Event Subscription

Next.js components subscribe to relevant events:

```typescript
// In React component or hook
useEffect(() => {
  const unsubscribe = eventStream.subscribe(EventType.USER_REGISTERED, (event) => {
    // Update UI, show notification, refresh data, etc.
    toast.success('New user registered!');
    queryClient.invalidateQueries(['users']);
  });
  
  return unsubscribe;
}, []);
```

## Event Categories

### Domain Events
- User lifecycle: registered, updated, deleted, logged in/out
- Resource CRUD: created, updated, deleted
- Business processes: order placed, payment processed, etc.

### System Events
- Health status changes
- Performance metrics
- Error occurrences
- Configuration updates

### UI Events
- User interactions that need server-side tracking
- Collaborative editing actions
- Presence updates (user online/offline)

## Benefits of This Approach

### 1. Loose Coupling
- Frontend doesn't need to know about all backend side effects
- Services can be developed and deployed independently
- Easy to add new event consumers without changing publishers

### 2. Scalability
- Heavy operations happen asynchronously via workers
- Load is distributed across multiple services
- Easy to scale specific components based on load

### 3. Real-time User Experience
- Instant updates across all connected clients
- Optimistic UI updates with event confirmations
- Seamless multi-tab synchronization

### 4. Auditability
- Complete event log of all system actions
- Easy debugging with event replay
- Built-in analytics and monitoring

### 5. Resilience
- Failed operations can be retried via queue
- System continues functioning even if some workers are down
- Dead letter queues catch persistent failures

## Frontend State Management

Events integrate with state management solutions:

```typescript
// Redux/Zustand action triggered by events
eventStream.subscribe(EventType.USER_UPDATED, (event) => {
  store.dispatch(updateUser(event.data));
});
```

## Testing Strategy

### Backend
- Unit tests for event publishers
- Integration tests for event flow
- Mock event bus for isolated testing

### Frontend
- Mock WebSocket connections
- Test event handler logic
- Verify UI updates from events

## Security Considerations

### Event Authorization
- Verify user permissions before sending events
- Filter event data based on user role
- Use separate channels for different user types

### Data Privacy
- Don't include sensitive data in events
- Use event IDs with separate data fetch if needed
- Implement event encryption for sensitive workflows

## Implementation Checklist

When implementing a new feature with events:

- [ ] Define event types in `packages/types/src/events.ts`
- [ ] Add event publisher in Express service layer
- [ ] Create worker handler for async processing
- [ ] Set up frontend event subscription
- [ ] Add event-based UI updates
- [ ] Write tests for event flow
- [ ] Document event in feature-map.json
- [ ] Consider error scenarios and retries

## Future Enhancements

### Potential additions to the event system:
1. Event sourcing for complete state reconstruction
2. CQRS pattern for read/write separation
3. Event replay for debugging and testing
4. Real-time analytics dashboard
5. Event-driven microservices communication

## References

- Event types: `packages/types/src/events.ts`
- Queue configuration: `docker-compose.yml` (LocalStack SQS)
- Worker handlers: `apps/worker/src/handlers/`
- WebSocket setup: (To be implemented in Express app)