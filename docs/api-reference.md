# API Reference

Base URL: `http://localhost:3000`

---

## Health Check

### `GET /health`

Returns server status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-07T00:00:00.000Z"
}
```

---

## Users

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

Get a user by ID.

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

**Response `404`:**
```json
{
  "success": false,
  "error": "User with id \"999\" not found"
}
```

---

### `POST /api/users`

Create a new user.

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
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "createdAt": "2026-03-07 00:00:00+00",
    "updatedAt": "2026-03-07 00:00:00+00"
  },
  "message": "User created successfully"
}
```

**Response `400` (validation):**
```json
{
  "success": false,
  "error": "Validation failed",
  "fields": {
    "name": "Name is required",
    "password": "Password must be at least 6 characters"
  }
}
```

**Response `409` (duplicate email):**
```json
{
  "success": false,
  "error": "User with email \"alice@example.com\" already exists"
}
```

---

### `PUT /api/users/:id`

Update an existing user. All fields are optional.

**Request Body:**
```json
{
  "name": "Alice Updated",
  "email": "newemail@example.com",
  "password": "newpassword"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Alice Updated",
    "email": "newemail@example.com",
    "createdAt": "2026-03-07 00:00:00+00",
    "updatedAt": "2026-03-07 00:00:01+00"
  },
  "message": "User updated successfully"
}
```

**Response `404`:** same as GET by ID

---

### `DELETE /api/users/:id`

Delete a user.

**Response `200`:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Response `404`:** same as GET by ID

---

## Error Response Format

All error responses follow a consistent structure:

```json
{
  "success": false,
  "error": "Error message",
  "fields": {}          // only for ValidationError
}
```

| HTTP Status | Error Type | Description |
|-------------|-----------|-------------|
| 400 | `ValidationError` | Invalid input data |
| 404 | `NotFoundError` | Resource not found |
| 409 | `ConflictError` | Duplicate resource |
| 500 | Internal Error | Unexpected server error |
