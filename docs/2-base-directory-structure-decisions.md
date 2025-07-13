# Base Directory Structure Design Decisions

This document explains the design decisions made during TICKET-002: Create base directory structure.

## Directory Organization

### Apps and Packages Separation

```
root/
├── apps/       # Deployable applications
└── packages/   # Shared internal packages
```

**Decision**: We chose the standard monorepo convention of separating deployable applications from shared packages.

**Rationale**:
- **Clear boundaries**: Apps consume packages, never the reverse
- **Deployment clarity**: Everything in `apps/` is deployable
- **Dependency management**: Packages can be versioned and shared
- **Scalability**: Easy to add new apps or extract shared code

## Configuration Files

### 1. Node Version (`.nvmrc`)

**Decision**: Set Node 20 as the default version.

**Rationale**:
- Node 20 is LTS (Long Term Support)
- Native fetch API support
- Improved performance and security
- Better ESM support

### 2. Editor Configuration (`.editorconfig`)

**Decision**: Enforce consistent coding standards across all editors.

**Key choices**:
- **2-space indentation**: JavaScript/TypeScript convention
- **LF line endings**: Cross-platform consistency
- **UTF-8 encoding**: Unicode support
- **Trailing newline**: Git best practice

### 3. Code Formatting (`.prettierrc`)

**Decision**: Opinionated formatting with minimal configuration.

**Key choices**:
- **Single quotes**: Common in JavaScript ecosystem
- **Semicolons**: Explicit statement termination
- **Trailing commas (ES5)**: Cleaner git diffs
- **80-character line width**: Readable on most screens
- **Arrow function parentheses**: Always require for consistency

### 4. Linting Rules (`.eslintrc.js`)

**Decision**: TypeScript-first with recommended rules.

**Key choices**:
- **`@typescript-eslint/parser`**: Full TypeScript support
- **Unused vars with underscore**: Allow `_` prefix for intentionally unused
- **Warn on `any`**: Gradual type improvement
- **No explicit return types**: Let TypeScript infer

**Integration**:
- `eslint-config-prettier`: Prevents ESLint/Prettier conflicts
- Ignores build outputs and generated files

## Environment Configuration

### `.env.example` Structure

**Decision**: Comprehensive example with all possible variables documented.

**Organization by concern**:

1. **Core Infrastructure**
   - Database (PostgreSQL with connection pooling)
   - Redis (optional caching)
   - Node environment

2. **Application Settings**
   - API configuration
   - Authentication (JWT-based)
   - CORS settings

3. **External Services**
   - AWS/LocalStack for queues
   - SMTP for emails
   - Rate limiting

4. **Development Experience**
   - Pretty logging in development
   - LocalStack endpoint for local AWS services
   - Separate frontend URLs

**Security considerations**:
- Clear indication to change secrets in production
- Sensible defaults for development
- No actual secrets in the example file

## File Organization Patterns

### `.gitkeep` Files

**Decision**: Added `.gitkeep` files to preserve empty directories.

**Rationale**:
- Git doesn't track empty directories
- Ensures directory structure is maintained
- Will be removed as real files are added

### Ignore Patterns

**`.prettierignore` decisions**:
- Don't format build outputs
- Skip markdown files (preserve intentional formatting)
- Ignore generated TypeScript info files

**ESLint ignore patterns**:
- Same as Prettier for consistency
- Prevents linting generated code

## Development Workflow Implications

These decisions establish:

1. **Consistent development environment**
   - Same Node version via `.nvmrc`
   - Same editor settings via `.editorconfig`

2. **Automated code quality**
   - Format on save with Prettier
   - Lint errors caught early

3. **Clear configuration hierarchy**
   - Root configs apply to all packages
   - Packages can override if needed

4. **Environment flexibility**
   - Easy to copy `.env.example` to `.env.local`
   - All variables documented
   - Supports multiple environments

## Next Steps

With this foundation:
- Each app/package will extend these base configurations
- CI/CD can enforce these standards
- New developers have clear environment setup

This structure provides guardrails while maintaining flexibility for package-specific needs.