# Database & Liquibase Guide

## Overview

- **Database:** PostgreSQL 16 (Docker)
- **Schema Management:** Liquibase (YAML changelogs)
- **Driver:** `postgres` (postgresjs) — lightweight, tagged template SQL
- **Credentials:** Stored in `.env`, never committed to Git

## Setup

### 1. Start PostgreSQL

```bash
bun run db:up
```

This starts a PostgreSQL container with:
- Main database: `ts_bun_starter`
- Test database: `ts_bun_starter_test` (created by `scripts/init-test-db.sql`)

### 2. Run Migrations

```bash
bun run db:migrate          # main database
bun run db:migrate:test     # test database
```

### 3. Check Status

```bash
docker compose ps           # container status
docker compose logs db      # PostgreSQL logs
```

## Docker Commands

| Command | Description |
|---------|-------------|
| `bun run db:up` | Start PostgreSQL |
| `bun run db:down` | Stop PostgreSQL |
| `bun run db:migrate` | Run migrations (main DB) |
| `bun run db:migrate:test` | Run migrations (test DB) |
| `bun run db:reset` | Full reset: stop → delete volume → start → migrate both DBs |

## Liquibase Changelogs

All changelogs live in `liquibase/changelogs/` using YAML format.

### File Structure

```
liquibase/
├── changelog.yaml            # Root — includes all changelogs
├── liquibase.properties      # Driver config (no credentials)
└── changelogs/
    └── 001-create-users-table.yaml
```

### Naming Convention

```
NNN-short-description.yaml
```

- `NNN` — zero-padded sequential number (001, 002, ...)
- Files are auto-included alphabetically via `includeAll`

### Creating a New Migration

1. Create `liquibase/changelogs/NNN-description.yaml`:

```yaml
databaseChangeLog:
  - changeSet:
      id: NNN-description
      author: your-name
      changes:
        - createTable:
            tableName: my_table
            columns:
              - column:
                  name: id
                  type: SERIAL
                  autoIncrement: true
                  constraints:
                    primaryKey: true
                    nullable: false
              - column:
                  name: name
                  type: VARCHAR(255)
                  constraints:
                    nullable: false
      rollback:
        - dropTable:
            tableName: my_table
```

2. Run against both databases:
```bash
bun run db:migrate
bun run db:migrate:test
```

### Common Liquibase Operations

**Add a column:**
```yaml
changes:
  - addColumn:
      tableName: users
      columns:
        - column:
            name: avatar_url
            type: VARCHAR(500)
```

**Add an index:**
```yaml
changes:
  - createIndex:
      indexName: idx_users_email
      tableName: users
      columns:
        - column:
            name: email
```

**Add a foreign key:**
```yaml
changes:
  - addForeignKeyConstraint:
      baseTableName: orders
      baseColumnNames: user_id
      referencedTableName: users
      referencedColumnNames: id
      constraintName: fk_orders_user
```

Always include a `rollback` section for safe reversibility.

## Schema

### `users` Table

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `SERIAL` | Primary key, auto-increment |
| `name` | `VARCHAR(255)` | NOT NULL |
| `email` | `VARCHAR(255)` | NOT NULL, UNIQUE |
| `password` | `VARCHAR(255)` | NOT NULL |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT NOW() |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT NOW() |

## Connection Configuration

All credentials are in `.env` (gitignored):

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ts_bun_starter
DB_USER=postgres
DB_PASSWORD=postgres
```

These flow to:
- **Bun app** — read via `Bun.env.*` in `src/config/config.ts`
- **Docker Compose** — interpolated into service definitions
- **Liquibase** — passed via `LIQUIBASE_COMMAND_*` environment variables

## Connecting Directly

```bash
# Via Docker
docker compose exec db psql -U postgres -d ts_bun_starter

# Or locally (if psql installed)
psql -h localhost -p 5432 -U postgres -d ts_bun_starter
```
