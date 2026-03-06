# API Reference

Base URL: `http://localhost:3000`

---

## Health Check

### `GET /health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-07T00:00:00.000Z"
}
```

---

## Authentication (`/api/auth`)

### `POST /api/auth/register`

Register a new user and receive auth tokens.

**Request Body:**
```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "secret123"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | ✅ | Non-empty |
| `email` | string | ✅ | Must contain `@` |
| `password` | string | ✅ | ≥ 6 characters |

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "Alice",
      "email": "alice@example.com",
      "createdAt": "2026-03-07 00:00:00+00",
      "updatedAt": "2026-03-07 00:00:00+00"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "a1b2c3d4e5...",
    "expiresIn": 900
  },
  "message": "Registration successful"
}
```

---

### `POST /api/auth/login`

Authenticate with email + password.

**Request Body:**
```json
{
  "email": "alice@example.com",
  "password": "secret123"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "name": "Alice", "email": "alice@example.com", ... },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "a1b2c3d4e5...",
    "expiresIn": 900
  },
  "message": "Login successful"
}
```

**Response `400`:**
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

---

### `POST /api/auth/refresh`

Exchange a valid refresh token for new access + refresh tokens. The old refresh token is revoked (rotation).

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5..."
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "f6g7h8i9j0...",
    "expiresIn": 900
  },
  "message": "Token refreshed"
}
```

---

### `POST /api/auth/logout`

Revoke a refresh token.

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5..."
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### `GET /api/auth/me` 🔒

Get the current authenticated user. **Requires `Authorization: Bearer <accessToken>` header.**

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "createdAt": "2026-03-07 00:00:00+00",
    "updatedAt": "2026-03-07 00:00:00+00"
  }
}
```

**Response `401`:**
```json
{
  "success": false,
  "error": "Unauthorized — invalid or missing token"
}
```

---

## Users (`/api/users`)

### `GET /api/users`

List all users.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Alice",
      "email": "alice@example.com",
      "createdAt": "2026-03-07 00:00:00+00",
      "updatedAt": "2026-03-07 00:00:00+00"
    }
  ]
}
```

---

### `GET /api/users/:id`

**Response `200`:** Single user object  
**Response `404`:** `{ "success": false, "error": "User with id \"999\" not found" }`

---

### `POST /api/users`

Create a new user.

**Request Body:**
```json
{ "name": "Alice", "email": "alice@example.com", "password": "secret123" }
```

**Response `201`:** User created (password excluded)  
**Response `400`:** Validation error with `fields`  
**Response `409`:** Duplicate email

---

### `PUT /api/users/:id`

Update user. All fields optional.

**Request Body:**
```json
{ "name": "Alice Updated" }
```

**Response `200`:** Updated user  
**Response `404`:** Not found

---

### `DELETE /api/users/:id`

**Response `200`:** `{ "success": true, "message": "User deleted successfully" }`  
**Response `404`:** Not found

---

## Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "fields": {}
}
```

| HTTP Status | Error Type | Description |
|-------------|-----------|-------------|
| 400 | `ValidationError` | Invalid input data / bad credentials |
| 401 | Unauthorized | Missing or invalid JWT |
| 404 | `NotFoundError` | Resource not found |
| 409 | `ConflictError` | Duplicate resource |
| 500 | Internal Error | Unexpected server error |
