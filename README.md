# ts-bun-starter

A production-ready backend template built with **Bun + TypeScript + Elysia**, following a Spring Boot-inspired layered architecture with **PostgreSQL** and **Liquibase** for database management.

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | Layered design, DI, request lifecycle, error handling |
| [API Reference](docs/api-reference.md) | All endpoints, request/response examples |
| [Database](docs/database.md) | PostgreSQL setup, Liquibase changelogs, schema |
| [Testing](docs/testing.md) | Test strategy, utilities, templates |
| [Development](docs/development.md) | Setup, scripts, adding new modules |

## Architecture

```
Controller  →  Service  →  Repository  →  DAO  →  PostgreSQL
                                                    ↑
                                               Liquibase
                                            (schema management)
```

| Layer | Folder | Purpose |
|-------|--------|---------|
| **Models** | `src/models/` | Entity types, DTOs |
| **DAO** | `src/dao/` | Raw PostgreSQL queries (postgresjs) |
| **Repository** | `src/repositories/` | Async interface abstraction |
| **Service** | `src/services/` | Business logic, validation |
| **Controller** | `src/controllers/` | REST endpoints (Elysia) |
| **Container** | `src/container/` | Lightweight dependency injection |

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.1
- [Docker](https://www.docker.com/) & Docker Compose
- (Optional) [Liquibase CLI](https://www.liquibase.com/) for running migrations outside Docker

## Quick Start

```bash
# 1. Clone & install
git clone <your-repo-url>
cd ts-bun-starter
bun install

# 2. Copy env file
cp .env.example .env

# 3. Start PostgreSQL
bun run db:up

# 4. Run database migrations
bun run db:migrate
bun run db:migrate:test

# 5. Start development server
bun run dev
```

The server starts at `http://localhost:3000`.

## Database Management

### Docker Commands

| Command | Description |
|---------|-------------|
| `bun run db:up` | Start PostgreSQL container |
| `bun run db:down` | Stop PostgreSQL container |
| `bun run db:migrate` | Run Liquibase migrations (main db) |
| `bun run db:migrate:test` | Run Liquibase migrations (test db) |
| `bun run db:reset` | Reset: stop, delete volume, start, migrate |

### Adding New Migrations

Create a new YAML file in `liquibase/changelogs/`:

```yaml
# liquibase/changelogs/002-create-orders-table.yaml
databaseChangeLog:
  - changeSet:
      id: 002-create-orders-table
      author: your-name
      changes:
        - createTable:
            tableName: orders
            columns:
              - column:
                  name: id
                  type: SERIAL
                  autoIncrement: true
                  constraints:
                    primaryKey: true
                    nullable: false
              # ... more columns
      rollback:
        - dropTable:
            tableName: orders
```

Then run: `bun run db:migrate && bun run db:migrate:test`

## API Endpoints

### Users (`/api/users`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List all users |
| `POST` | `/api/users` | Create a new user |
| `GET` | `/api/users/:id` | Get user by ID |
| `PUT` | `/api/users/:id` | Update user |
| `DELETE` | `/api/users/:id` | Delete user |

**Create User:**

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com", "password": "secret123"}'
```

## Project Structure

```
ts-bun-starter/
├── docker-compose.yml          # PostgreSQL + Liquibase
├── liquibase/
│   ├── changelog.yaml           # Main changelog (includes all)
│   ├── liquibase.properties     # Connection config
│   ├── liquibase-test.properties
│   └── changelogs/
│       └── 001-create-users-table.yaml
├── scripts/
│   └── init-test-db.sql         # Creates test database
├── src/
│   ├── index.ts                 # Bootstrap & DI wiring
│   ├── config/config.ts         # Environment config
│   ├── container/container.ts   # DI container
│   ├── database/database.ts     # PostgreSQL connection pool
│   ├── common/
│   │   ├── errors.ts            # Custom error classes
│   │   ├── logger.ts            # Structured JSON logger
│   │   └── types.ts             # Shared interfaces
│   ├── models/user.model.ts
│   ├── dao/user.dao.ts
│   ├── repositories/user.repository.ts
│   ├── services/user.service.ts
│   ├── controllers/user.controller.ts
│   └── middleware/
│       ├── error-handler.ts
│       └── request-logger.ts
└── tests/                       # Mirrors src/ structure
    ├── helpers/test-utils.ts
    ├── container/container.test.ts
    ├── dao/user.dao.test.ts
    ├── repositories/user.repository.test.ts
    ├── services/user.service.test.ts
    └── controllers/user.controller.test.ts
```

## Testing

Tests run against a **real PostgreSQL test database**. Docker must be running.

```bash
# Ensure DB + migrations are ready
bun run db:up
bun run db:migrate:test

# Run all tests
bun test
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment |
| `LOG_LEVEL` | `info` | Log level |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `ts_bun_starter` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |

## Adding a New Module

1. **Model** — define types in `src/models/`
2. **Migration** — create Liquibase changeset in `liquibase/changelogs/`
3. **DAO** — implement queries in `src/dao/`
4. **Repository** — wrap DAO behind interface in `src/repositories/`
5. **Service** — add validation and logic in `src/services/`
6. **Controller** — expose routes in `src/controllers/`
7. **Wire** — register in the DI container in `src/index.ts`
8. **Test** — add tests for each layer in `tests/`
