# Skelly - AI-Friendly Monorepo Boilerplate

An easy-to-use boilerplate for building a generic fullstack system with a monorepo architecture optimized for AI-assisted development.

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+** - Install via [nvm](https://github.com/nvm-sh/nvm) or [Node.js website](https://nodejs.org/)
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
- **npm 10+** - Comes with Node.js 20

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd skelly
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your specific configuration if needed. The defaults work for local development.

### 🐳 Local Services

The project uses Docker Compose to run local services including PostgreSQL, Redis, LocalStack (AWS emulation), and admin tools.

#### Start Services

```bash
npm run docker:start
```

This command will:
- Pull required Docker images (first time only)
- Start PostgreSQL on port 5432
- Start Redis on port 6379
- Start LocalStack on port 4566
- Start Adminer (database UI) on port 8080
- Start Redis Commander on port 8081
- Run initialization scripts automatically

#### Stop Services

```bash
npm run docker:stop
```

#### Restart Services

```bash
npm run docker:restart
```

#### View Logs

```bash
# All services
npm run docker:logs

# Specific service (use the script directly)
./scripts/docker-helper.sh logs postgres
```

#### Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| PostgreSQL | `localhost:5432` | User: `postgres`<br>Password: `password`<br>Database: `skelly_dev` |
| Redis | `localhost:6379` | No auth required |
| LocalStack | `http://localhost:4566` | No auth required |
| Adminer | `http://localhost:8080` | Use PostgreSQL credentials above |
| Redis Commander | `http://localhost:8081` | No auth required |

#### Database Access

```bash
# PostgreSQL CLI
npm run docker:psql

# Redis CLI
npm run docker:redis
```

#### Reset All Data

⚠️ **Warning**: This will delete all data in PostgreSQL and Redis!

```bash
npm run docker:reset
```

### 🛠️ Development Workflow

1. **Start services** (if not already running)
   ```bash
   npm run docker:start
   ```

2. **Run development servers** (once implemented)
   ```bash
   npm run dev
   ```

3. **Run tests**
   ```bash
   npm run test
   ```

4. **Lint code**
   ```bash
   npm run lint
   ```

5. **Type check**
   ```bash
   npm run type-check
   ```

### 📁 Project Structure

```
skelly/
├── apps/           # Deployable applications
│   ├── api/       # Express REST API
│   ├── worker/    # Background job processor
│   └── web/       # (Optional) Next.js frontend
├── packages/       # Shared internal packages
│   ├── auth/      # Authentication logic
│   ├── db/        # Database models & migrations
│   ├── types/     # Shared TypeScript types
│   └── utils/     # Common utilities
├── scripts/        # Helper scripts
└── docs/          # Documentation
```

### 🔧 Troubleshooting

#### Port Conflicts

If you get "port already in use" errors:

1. Check what's using the port:
   ```bash
   lsof -i :5432  # PostgreSQL
   lsof -i :6379  # Redis
   ```

2. Kill the process or change the port in `docker-compose.yml`

#### Docker Issues

1. Ensure Docker Desktop is running
2. Try resetting Docker:
   ```bash
   docker system prune -a
   ```

#### Service Health

Check service status:
```bash
docker-compose ps
```

All services should show "healthy" status.

### 📚 Next Steps

- Review the [architecture documentation](docs/CLAUDE.md)
- Check the [development roadmap](docs/Roadmap.md)
- Explore the [design decisions](docs/)

### 🤖 AI Development

This project is optimized for AI-assisted development. The structure and conventions are designed to be easily understood and extended by AI coding assistants.

## 📝 License

[Your License Here]

## 🤝 Contributing

[Your Contributing Guidelines Here]