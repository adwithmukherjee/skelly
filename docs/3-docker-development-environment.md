# Docker Development Environment Design Decisions

This document explains the design decisions made during TICKET-003: Configure Docker development environment.

## Service Architecture

### Core Services Selection

**PostgreSQL 16 Alpine**
- **Decision**: Use PostgreSQL as the primary database with Alpine Linux variant
- **Rationale**:
  - PostgreSQL offers advanced features (JSON, arrays, full-text search)
  - Alpine variant reduces image size (faster pulls, less storage)
  - Version 16 provides latest performance improvements
  - Native UUID support aligns with our schema design

**LocalStack 3.0**
- **Decision**: Use LocalStack for AWS service emulation
- **Rationale**:
  - Eliminates need for AWS credentials in development
  - Supports SQS, S3, and SES out of the box
  - Version 3.0 has improved performance and stability
  - Cost-effective local development

**Redis 7 Alpine**
- **Decision**: Include Redis as optional caching layer
- **Rationale**:
  - Session storage for horizontal scaling
  - Queue job deduplication
  - API response caching
  - Lightweight Alpine variant

### Development Tools

**Adminer**
- **Decision**: Include web-based database management
- **Rationale**:
  - No local PostgreSQL client needed
  - Cross-platform consistency
  - Lightweight alternative to pgAdmin
  - Dracula theme for better developer experience

**Redis Commander**
- **Decision**: Include Redis visualization tool
- **Rationale**:
  - Easy debugging of cached data
  - Monitor queue states
  - No CLI knowledge required

## Network Configuration

### Single Bridge Network
```yaml
networks:
  skelly-network:
    driver: bridge
    name: skelly-network
```

**Decision**: All services on one network
**Rationale**:
- Simplified inter-service communication
- Services addressable by container name
- Isolated from other Docker projects
- Easy to add new services

## Health Checks

### Implementation Strategy
Every service includes health checks:
- PostgreSQL: `pg_isready` command
- LocalStack: HTTP endpoint check
- Redis: `redis-cli ping`

**Benefits**:
- Dependent services wait for readiness
- Docker reports accurate status
- Automatic restart on failure
- Better local development experience

## Volume Management

### Named Volumes
```yaml
volumes:
  postgres_data:
    name: skelly-postgres-data
  redis_data:
    name: skelly-redis-data
```

**Decision**: Use named volumes over bind mounts
**Rationale**:
- Better performance on macOS/Windows
- Easier to manage with Docker commands
- Consistent across different host systems
- Simple backup/restore process

## Initialization Scripts

### Database Initialization
`scripts/init-db.sql`:
- Enables UUID extension
- Creates initial schema
- Sets up migrations table

**Design**: Minimal initialization
**Rationale**: 
- Drizzle will handle main schema
- Only bootstrap essentials
- Idempotent operations

### LocalStack Initialization
`scripts/init-aws.sh`:
- Creates SQS queues with DLQ
- Sets up S3 buckets
- Configures CORS policies

**Design**: Declarative setup
**Rationale**:
- Reproducible environment
- No manual AWS CLI commands
- Automatic on container start

## Helper Scripts

### docker-helper.sh
Provides common operations:
- Start/stop services
- View logs
- Reset data
- Access CLIs

**Design**: Single entry point
**Rationale**:
- Reduces Docker Compose complexity
- Consistent commands across team
- Built-in safety checks
- Colored output for clarity

## Configuration Defaults

### PostgreSQL Settings
- Standard port 5432
- Simple password for development
- pg_stat_statements for query analysis

### Redis Configuration
- Memory limit: 256MB
- LRU eviction policy
- Append-only file persistence

### LocalStack Services
- Limited to needed services (SQS, S3, SES)
- Standard AWS region (us-east-1)
- Gateway on port 4566

## Security Considerations

### Development Only
- Simple passwords acceptable
- All services exposed on localhost
- Admin tools included

### Production Differences
- Strong passwords from secrets
- Internal-only networking
- No admin tools
- TLS/SSL enabled

## Docker Compose Version

### Version 3.8
**Decision**: Use Compose file version 3.8
**Rationale**:
- Supports all needed features
- Wide compatibility
- Health check support
- Good documentation

## Missing Intentionally

### What We Didn't Include
1. **Nginx/Traefik**: Not needed for local development
2. **Elasticsearch**: Can be added when search is needed
3. **Monitoring**: Overkill for development
4. **Mail Server**: LocalStack SES is sufficient

These can be added as the project grows.

## Usage Workflow

Expected developer workflow:
1. `./scripts/docker-helper.sh start`
2. Services auto-initialize
3. Access Adminer at http://localhost:8080
4. Access Redis Commander at http://localhost:8081
5. LocalStack ready at http://localhost:4566

## Next Steps

With Docker environment ready:
- Implement database migrations (Drizzle)
- Create seed data scripts
- Add service integration tests
- Document production deployment