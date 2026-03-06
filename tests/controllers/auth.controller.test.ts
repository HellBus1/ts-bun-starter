/**
 * Auth Controller integration tests.
 *
 * Tests the full auth flow against a real PostgreSQL test database.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import { Elysia } from "elysia";
import type { Sql } from "postgres";
import { createAuthController } from "../../src/controllers/auth.controller";
import { AuthService } from "../../src/services/auth.service";
import { UserRepository } from "../../src/repositories/user.repository";
import { createUserDao } from "../../src/dao/user.dao";
import { createRefreshTokenDao } from "../../src/dao/refresh-token.dao";
import { createJwtHelper } from "../../src/common/jwt";
import { errorHandler } from "../../src/middleware/error-handler";
import { createTestConnection, truncateAll } from "../helpers/test-utils";

const TEST_JWT_SECRET = "test-secret-key-for-testing-only";

describe("Auth Controller", () => {
  let sql: Sql;
  let app: any;

  beforeAll(() => {
    sql = createTestConnection();
    const dao = createUserDao(sql);
    const refreshTokenDao = createRefreshTokenDao(sql);
    const repository = new UserRepository(dao);
    const jwt = createJwtHelper(TEST_JWT_SECRET, 900);
    const authService = new AuthService(repository, refreshTokenDao, jwt, 7);

    app = new Elysia()
      .use(errorHandler)
      .use(createAuthController(authService, jwt));
  });

  beforeEach(async () => {
    await truncateAll(sql);
  });

  afterAll(async () => {
    await sql.end();
  });

  // Helper: register a user
  async function registerUser(name = "Alice", email = "alice@test.com", password = "secret123") {
    const res = await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
    );
    return { response: res, body: (await res.json()) as any };
  }

  describe("POST /api/auth/register", () => {
    it("should register a new user and return tokens", async () => {
      const { response, body } = await registerUser();

      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.user.name).toBe("Alice");
      expect(body.data.user).not.toHaveProperty("password");
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
      expect(body.data.expiresIn).toBe(900);
    });

    it("should return 400 for invalid input", async () => {
      const { response, body } = await registerUser("", "bad", "12");

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should return 409 for duplicate email", async () => {
      await registerUser();
      const { response, body } = await registerUser();

      expect(response.status).toBe(409);
      expect(body.success).toBe(false);
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login with valid credentials", async () => {
      await registerUser();

      const res = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "alice@test.com", password: "secret123" }),
        })
      );
      const body = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
    });

    it("should reject invalid password", async () => {
      await registerUser();

      const res = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "alice@test.com", password: "wrongpassword" }),
        })
      );
      const body = (await res.json()) as any;

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should refresh tokens with valid refresh token", async () => {
      const { body: registerBody } = await registerUser();
      const refreshToken = registerBody.data.refreshToken;

      const res = await app.handle(
        new Request("http://localhost/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        })
      );
      const body = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      // New refresh token (rotation)
      expect(body.data.refreshToken).not.toBe(refreshToken);
    });

    it("should reject invalid refresh token", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: "invalid" }),
        })
      );
      const body = (await res.json()) as any;

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return current user with valid token", async () => {
      const { body: registerBody } = await registerUser();
      const accessToken = registerBody.data.accessToken;

      const res = await app.handle(
        new Request("http://localhost/api/auth/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      );
      const body = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe("Alice");
      expect(body.data).not.toHaveProperty("password");
    });

    it("should return 401 without token", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/me")
      );
      const body = (await res.json()) as any;

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
    });

    it("should return 401 with invalid token", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/me", {
          headers: { Authorization: "Bearer invalid-token" },
        })
      );
      const body = (await res.json()) as any;

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should revoke refresh token on logout", async () => {
      const { body: registerBody } = await registerUser();
      const refreshToken = registerBody.data.refreshToken;

      const res = await app.handle(
        new Request("http://localhost/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        })
      );
      const body = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);

      // Try to use revoked refresh token — should fail
      const refreshRes = await app.handle(
        new Request("http://localhost/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        })
      );
      const refreshBody = await refreshRes.json();

      expect(refreshRes.status).toBe(400);
      expect(refreshBody.success).toBe(false);
    });
  });
});
