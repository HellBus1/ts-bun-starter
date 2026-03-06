# ts-bun-starter

A production-ready backend template built with **Bun + TypeScript + Elysia**, featuring a Spring Boot-inspired layered architecture, **PostgreSQL**, **Liquibase**, and **JWT authentication**.

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | Layered design, auth flow, DI, request lifecycle |
| [API Reference](docs/api-reference.md) | All endpoints with request/response examples |
| [Database](docs/database.md) | PostgreSQL setup, Liquibase changelogs, schema |
| [Testing](docs/testing.md) | Test strategy, utilities, templates |
| [Development](docs/development.md) | Setup, scripts, adding new modules |

## Architecture

```
Controller  →  Service  →  Repository  →  DAO  →  PostgreSQL
     ↑              ↑                                  ↑
Auth Guard    Auth Service                         Liquibase
 (JWT)      (login, register)                  (schema management)
```

| Layer | Folder | Purpose |
|-------|--------|---------|
| **Models** | `src/models/` | Entity types, DTOs |
| **DAO** | `src/dao/` | Raw PostgreSQL queries (postgresjs) |
| **Repository** | `src/repositories/` | Async interface abstraction |
| **Service** | `src/services/` | Business logic, validation, auth |
| **Controller** | `src/controllers/` | REST endpoints (Elysia) |
| **Middleware** | `src/middleware/` | Error handler, logger, auth guard |
| **Container** | `src/container/` | Lightweight dependency injection |

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.1
- [Docker](https://www.docker.com/) & Docker Compose

## Quick Start

```bash
# 1. Clone & install
git clone <your-repo-url>
cd ts-bun-starter
bun install

# 2. Copy env file and configure
cp .env.example .env
# Edit .env — set JWT_SECRET to a strong random string

# 3. Start PostgreSQL
bun run db:up

# 4. Run database migrations
bun run db:migrate
bun run db:migrate:test

# 5. Start development server
bun run dev
```

The server starts at `http://localhost:3000`.

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | — | Register + get tokens |
| `POST` | `/api/auth/login` | — | Login + get tokens |
| `POST` | `/api/auth/refresh` | — | Rotate refresh token |
| `POST` | `/api/auth/logout` | — | Revoke refresh token |
| `GET` | `/api/auth/me` | 🔒 | Get current user |

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"secret123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}'

# Access protected route
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

### Users (`/api/users`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List all users |
| `POST` | `/api/users` | Create a new user |
| `GET` | `/api/users/:id` | Get user by ID |
| `PUT` | `/api/users/:id` | Update user |
| `DELETE` | `/api/users/:id` | Delete user |

## Database Management

| Command | Description |
|---------|-------------|
| `bun run db:up` | Start PostgreSQL container |
| `bun run db:down` | Stop PostgreSQL container |
| `bun run db:migrate` | Run Liquibase migrations (main db) |
| `bun run db:migrate:test` | Run Liquibase migrations (test db) |
| `bun run db:reset` | Full reset: stop → delete → start → migrate |

## Project Structure

```
ts-bun-starter/
├── docker-compose.yml
├── liquibase/
│   ├── changelog.yaml
│   ├── liquibase.properties
│   └── changelogs/
│       ├── 001-create-users-table.yaml
│       └── 002-create-refresh-tokens-table.yaml
├── src/
│   ├── index.ts                 # Bootstrap & DI wiring
│   ├── config/config.ts
│   ├── container/container.ts
│   ├── database/database.ts
│   ├── common/
│   │   ├── errors.ts
│   │   ├── jwt.ts               # JWT sign/verify (jose)
│   │   ├── logger.ts
│   │   └── types.ts
│   ├── models/user.model.ts
│   ├── dao/
│   │   ├── user.dao.ts
│   │   └── refresh-token.dao.ts
│   ├── repositories/user.repository.ts
│   ├── services/
│   │   ├── user.service.ts
│   │   └── auth.service.ts
│   ├── controllers/
│   │   ├── user.controller.ts
│   │   └── auth.controller.ts
│   └── middleware/
│       ├── error-handler.ts
│       ├── request-logger.ts
│       └── auth-guard.ts
├── tests/
│   ├── helpers/test-utils.ts
│   ├── dao/user.dao.test.ts
│   ├── repositories/user.repository.test.ts
│   ├── services/
│   │   ├── user.service.test.ts
│   │   └── auth.service.test.ts
│   └── controllers/
│       ├── user.controller.test.ts
│       └── auth.controller.test.ts
└── docs/
```

## Testing

```bash
bun run db:up && bun run db:migrate:test
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
| `JWT_SECRET` | — | **Required.** Signing key for JWTs |
| `JWT_ACCESS_EXPIRY_SECONDS` | `900` | Access token lifetime |
| `JWT_REFRESH_EXPIRY_DAYS` | `7` | Refresh token lifetime |

## Adding a New Module

1. **Model** — define types in `src/models/`
2. **Migration** — create Liquibase changeset in `liquibase/changelogs/`
3. **DAO** — implement queries in `src/dao/`
4. **Repository** — wrap DAO behind interface in `src/repositories/`
5. **Service** — add validation and logic in `src/services/`
6. **Controller** — expose routes in `src/controllers/`
7. **Wire** — register in the DI container in `src/index.ts`
8. **Test** — add tests for each layer in `tests/`
