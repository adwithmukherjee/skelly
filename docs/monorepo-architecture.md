# Monorepo Architecture Documentation

This document explains the architectural patterns and configuration decisions implemented in the Skelly monorepo setup.

## Overview

Skelly is configured as a monorepo using Turborepo, designed to support a full-stack platform with modular backend services, shared packages, and optional frontend applications. The architecture prioritizes:

- **Code sharing** between applications
- **Type safety** across package boundaries
- **Incremental builds** for performance
- **Clear separation of concerns**

## Core Technologies

### Turborepo

We chose Turborepo for monorepo orchestration because it provides:

- **Intelligent caching**: Only rebuilds what changed
- **Parallel execution**: Runs tasks concurrently when possible
- **Remote caching**: Share build artifacts across team/CI (when configured)
- **Pipeline definitions**: Declarative task dependencies

### Workspace Configuration

The monorepo uses npm workspaces (defined in root `package.json`):

```json
"workspaces": [
  "apps/*",
  "packages/*"
]
```

This structure provides:
- **apps/**: Deployable applications (API, worker, web)
- **packages/**: Shared internal packages (db, types, auth, utils)

## Configuration Patterns

### 1. Turborepo Pipeline (`turbo.json`)

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    }
  }
}
```

**Key Patterns:**
- `^build`: Topological dependency (build dependencies first)
- `outputs`: Cached artifacts for faster rebuilds
- `cache: false`: For tasks that should always run (tests, db operations)
- `persistent: true`: For long-running dev servers

### 2. TypeScript Configuration

**Two-tier configuration approach:**

1. **tsconfig.base.json**: Shared compiler options with `composite: true` for project references
2. **tsconfig.json**: Root config for IDE support

**Benefits:**
- Incremental compilation with `.tsbuildinfo` files
- Proper module resolution across packages
- Strict type checking enabled by default

**Key Settings:**
```json
{
  "strict": true,
  "isolatedModules": true,
  "incremental": true,
  "composite": true
}
```

### 3. Package.json Scripts

Centralized task execution through Turborepo:

```json
"scripts": {
  "build": "turbo build",
  "dev": "turbo dev",
  "lint": "turbo lint",
  "test": "turbo test"
}
```

**Pattern**: All scripts delegate to Turbo for optimal caching and parallelization.

### 4. Git Ignore Patterns

The `.gitignore` is structured for monorepo needs:

```
# Build outputs per package
dist/
build/
*.tsbuildinfo

# Turborepo cache
.turbo

# Environment files (each app has its own)
.env.local
.env.*.local
```

## Architectural Decisions

### 1. Private Repository

```json
"private": true
```

Prevents accidental publishing of the root package to npm.

### 2. Node Version Constraint

```json
"engines": {
  "node": ">=18.0.0"
}
```

Ensures modern JavaScript features and native fetch API support.

### 3. Package Manager Specification

```json
"packageManager": "npm@10.0.0"
```

Locks the package manager version for consistency across environments.

### 4. Global Dependencies

```json
"globalDependencies": ["**/.env.*local"]
```

Invalidates cache when environment files change, ensuring fresh builds.

## Benefits of This Architecture

1. **Developer Experience**
   - Single `npm install` at root
   - Unified tooling configuration
   - Fast incremental builds

2. **Code Organization**
   - Clear boundaries between apps and packages
   - Enforced dependencies through workspaces
   - Type safety across package boundaries

3. **Scalability**
   - Easy to add new apps or packages
   - Parallel task execution
   - Efficient CI/CD pipelines

4. **Maintainability**
   - Centralized dependency management
   - Consistent coding standards
   - Shared TypeScript configuration

## Next Steps

With this foundation in place, the next phases will:

1. Create the directory structure for apps and packages
2. Implement shared packages (types, db, auth, utils)
3. Build the core applications (API, worker)
4. Add testing and CI/CD pipelines

This architecture provides a solid foundation for building a scalable, maintainable full-stack platform with clear patterns for AI-assisted development.