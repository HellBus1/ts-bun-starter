# Architecture Guide

## Overview

This project follows a **Spring Boot-inspired layered architecture** built on Bun + TypeScript + Elysia, with PostgreSQL as the database, Liquibase for schema management, and **JWT authentication**.

## Layer Diagram

```
┌──────────────────────────────────────────────────┐
│                   HTTP Request                   │
└──────────────────────┬───────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────┐
│              Middleware Layer                     │
│  ┌────────────┐ ┌────────────┐ ┌──────────────┐  │
│  │Error Handler│ │Req Logger  │ │ Auth Guard   │  │
│  └────────────┘ └────────────┘ └──────────────┘  │
└──────────────────────┬───────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────┐
│              Controller Layer                    │
│  User Controller  │  Auth Controller             │
└──────────────────────┬───────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────┐
│              Service Layer                       │
│  UserService  │  AuthService                     │
└──────────────────────┬───────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────┐
│              Repository / DAO Layer              │
│  UserRepo → UserDao  │  RefreshTokenDao          │
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

## Authentication

JWT-based authentication using the `jose` library.

### Token Flow

```
1. Client sends POST /api/auth/register or /api/auth/login
2. Server validates credentials
3. Server generates:
   - Access token  (JWT, 15min, signed with HS256)
   - Refresh token (random base64url, 7 days, stored in DB)
4. Client includes access token in requests: Authorization: Bearer <token>
5. Auth guard extracts + verifies JWT, attaches userId to request
6. When access token expires, client calls POST /api/auth/refresh
7. Server rotates: revokes old refresh token, issues new pair
8. POST /api/auth/logout revokes the refresh token
```

### Components

| Component | File | Purpose |
|-----------|------|---------|
| JWT Helper | `src/common/jwt.ts` | Sign/verify JWT, generate refresh tokens |
| Auth Guard | `src/middleware/auth-guard.ts` | Extract Bearer token, verify JWT |
| Auth Service | `src/services/auth.service.ts` | Register, login, refresh, logout logic |
| Auth Controller | `src/controllers/auth.controller.ts` | REST endpoints |
| Refresh Token DAO | `src/dao/refresh-token.dao.ts` | Refresh token CRUD |

### Security Features

- **Bcrypt password hashing** — cost factor 10
- **Short-lived access tokens** — 15 minutes (configurable)
- **Refresh token rotation** — old token revoked on each refresh
- **Email normalization** — lowercase before comparison
- **No password in responses** — stripped at the service layer
- **Generic error messages** — login returns "Invalid email or password" (no enumeration)

## Dependency Injection

A lightweight DI container (`src/container/container.ts`) manages object creation:

```typescript
container.registerSingleton("database", () => new DatabaseManager(config.db));
container.registerSingleton("userDao", (c) =>
  createUserDao(c.resolve<DatabaseManager>("database").getConnection())
);
container.registerSingleton("authService", (c) =>
  new AuthService(
    c.resolve("userRepository"),
    c.resolve("refreshTokenDao"),
    c.resolve("jwt"),
    config.jwt.refreshExpiryDays
  )
);
```

Supports:
- **Singleton** — one instance, lazily created
- **Transient** — new instance per resolve
- **Instance** — pre-created object

## Request Lifecycle

### Public Route
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

### Protected Route
```
1. HTTP request hits Elysia
2. Middleware runs (logging, error handling)
3. Controller calls Auth Guard → extracts Bearer token
4. Auth Guard verifies JWT → returns userId or 401
5. Controller calls Service with userId
6. (same as steps 4–8 above)
```

## Error Handling

Custom error hierarchy in `src/common/errors.ts`:

| Error Class | HTTP Status | Use Case |
|-------------|-------------|----------|
| `ApiError` | any | Base class |
| `NotFoundError` | 404 | Resource not found |
| `ValidationError` | 400 | Invalid input / bad credentials |
| `ConflictError` | 409 | Duplicate resource |

Controllers use `try/catch` with a `handleError()` helper that maps error types to structured JSON responses.
