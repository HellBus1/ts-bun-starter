# Architecture Guide

## Overview

This project follows a **Spring Boot-inspired layered architecture** built on Bun + TypeScript + Elysia, with PostgreSQL as the database and Liquibase for schema management.

## Layer Diagram

```
┌──────────────────────────────────────────────────┐
│                   HTTP Request                   │
└──────────────────────┬───────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────┐
│              Middleware Layer                     │
│  ┌─────────────────┐  ┌──────────────────────┐   │
│  │  Error Handler   │  │  Request Logger      │   │
│  └─────────────────┘  └──────────────────────┘   │
└──────────────────────┬───────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────┐
│              Controller Layer                    │
│  Routes, request parsing, response formatting    │
└──────────────────────┬───────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────┐
│              Service Layer                       │
│  Business logic, validation, password hashing    │
└──────────────────────┬───────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────┐
│              Repository Layer                    │
│  Interface abstraction over data access          │
└──────────────────────┬───────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────┐
│              DAO Layer                           │
│  Raw PostgreSQL queries (postgresjs)             │
└──────────────────────┬───────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────┐
│              PostgreSQL                          │
│  Schema managed by Liquibase                     │
└──────────────────────────────────────────────────┘
```

## Layers in Detail

### Controller (`src/controllers/`)

- Defines REST endpoints using Elysia
- Parses request params, query, body
- Delegates to the Service layer
- Formats responses with `{ success, data, message }`
- Catches errors and maps them to HTTP status codes

### Service (`src/services/`)

- Contains all business logic
- Input validation (required fields, format, length)
- Password hashing with `Bun.password.hash`
- Conflict detection (e.g., duplicate email)
- Strips sensitive fields (password) from responses

### Repository (`src/repositories/`)

- Defines an **interface** (`IUserRepository`) that the Service depends on
- Concrete implementation delegates to the DAO
- Enables swapping the data source without changing business logic

### DAO (`src/dao/`)

- Executes raw PostgreSQL queries using `postgresjs` tagged templates
- Uses a **factory function** pattern (`createUserDao(sql)`) instead of classes
- All methods are `async` — PostgreSQL queries return Promises
- No DDL — schema is entirely managed by Liquibase

### Models (`src/models/`)

- TypeScript type definitions for entities, DTOs, and response types
- `User` — full entity (including password)
- `CreateUserDto` / `UpdateUserDto` — input shapes
- `UserResponse` — output shape (password stripped)

## Dependency Injection

A lightweight DI container (`src/container/container.ts`) manages object creation:

```typescript
container.registerSingleton("database", () => new DatabaseManager(config.db));
container.registerSingleton("userDao", (c) =>
  createUserDao(c.resolve<DatabaseManager>("database").getConnection())
);
```

Supports:
- **Singleton** — one instance, lazily created
- **Transient** — new instance per resolve
- **Instance** — pre-created object

## Request Lifecycle

```
1. HTTP request hits Elysia
2. Middleware runs (logging, error handling)
3. Controller parses input → calls Service
4. Service validates → calls Repository
5. Repository delegates to DAO
6. DAO executes SQL → returns result
7. Service transforms result → returns to Controller
8. Controller formats JSON response
```

## Error Handling

Custom error hierarchy in `src/common/errors.ts`:

| Error Class | HTTP Status | Use Case |
|-------------|-------------|----------|
| `ApiError` | any | Base class |
| `NotFoundError` | 404 | Resource not found |
| `ValidationError` | 400 | Invalid input |
| `ConflictError` | 409 | Duplicate resource |

Controllers use `try/catch` with a `handleError()` helper that maps error types to structured JSON responses.
