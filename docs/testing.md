# Testing Guide

## Overview

Tests run against a **real PostgreSQL test database** — no mocks at the database level (except the Service layer, which uses a mocked repository for unit testing).

## Prerequisites

```bash
# Start PostgreSQL
bun run db:up

# Run migrations on test database
bun run db:migrate:test
```

## Running Tests

```bash
# All tests
bun test

# Specific test file
bun test tests/dao/user.dao.test.ts

# Watch mode
bun test --watch
```

## Test Structure

```
tests/
├── helpers/
│   └── test-utils.ts               # DB connection, truncation, seeding
├── container/
│   └── container.test.ts            # DI container unit tests
├── dao/
│   └── user.dao.test.ts             # DAO tests (real PostgreSQL)
├── repositories/
│   └── user.repository.test.ts      # Repository tests (real PostgreSQL)
├── services/
│   └── user.service.test.ts         # Service tests (mocked repository)
└── controllers/
    └── user.controller.test.ts      # Integration tests (real PostgreSQL)
```

## Test Strategy by Layer

### DAO Tests
- Connect to real PostgreSQL test database
- `beforeEach`: truncate all tables (`TRUNCATE ... RESTART IDENTITY CASCADE`)
- Test raw query results directly
- Verify constraints (e.g., unique email)

### Repository Tests
- Same as DAO — real database
- Verify the async wrapper delegates correctly

### Service Tests
- **Mock-based** — no database dependency
- Create a mock `IUserRepository` with `mock()` functions
- Focus on business logic: validation, error throwing, password hashing
- Fastest tests in the suite

### Controller Tests
- **Integration tests** — full HTTP request/response cycle
- Real database via Elysia's `app.handle()`
- Test status codes, response format, error handling

### Container Tests
- Pure unit tests — no external dependencies
- Test registration, resolution, singletons, dependency chains

## Test Utilities

`tests/helpers/test-utils.ts` provides:

| Function | Purpose |
|----------|---------|
| `createTestConnection()` | Connect to `ts_bun_starter_test` database |
| `truncateAll(sql)` | Clear all rows, reset ID sequences |
| `createTestUserDao(sql)` | Create a DAO for the test connection |
| `seedUsers(dao)` | Insert 3 sample users (Alice, Bob, Charlie) |

## Adding Tests for a New Module

1. Create `tests/<layer>/<module>.test.ts`
2. Use `createTestConnection()` for database access
3. Use `beforeEach` + `truncateAll()` for clean state
4. Use `afterAll` + `sql.end()` to close connections
5. Follow the established patterns for your layer

### Template

```typescript
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import type { Sql } from "postgres";
import { createTestConnection, truncateAll } from "../helpers/test-utils";

describe("MyModule", () => {
  let sql: Sql;

  beforeAll(() => {
    sql = createTestConnection();
    // Setup DAO/repo/service
  });

  beforeEach(async () => {
    await truncateAll(sql);
  });

  afterAll(async () => {
    await sql.end();
  });

  it("should do something", async () => {
    // Test logic
  });
});
```

## Environment

Tests read from `.env` by default. Override for CI:

| Variable | Default | Purpose |
|----------|---------|---------|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `TEST_DB_NAME` | `ts_bun_starter_test` | Test database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |
