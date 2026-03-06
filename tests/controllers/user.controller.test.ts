/**
 * User Controller integration tests.
 *
 * Tests the full HTTP request/response cycle via Elysia's test utilities.
 * Uses a real DAO with a PostgreSQL test database.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import { Elysia } from "elysia";
import type { Sql } from "postgres";
import { createUserController } from "../../src/controllers/user.controller";
import { UserService } from "../../src/services/user.service";
import { UserRepository } from "../../src/repositories/user.repository";
import { createUserDao } from "../../src/dao/user.dao";
import { errorHandler } from "../../src/middleware/error-handler";
import { createTestConnection, truncateAll } from "../helpers/test-utils";

describe("User Controller", () => {
  let sql: Sql;
  let app: Elysia;

  beforeAll(() => {
    sql = createTestConnection();
    const dao = createUserDao(sql);
    const repository = new UserRepository(dao);
    const service = new UserService(repository);

    app = new Elysia()
      .use(errorHandler)
      .use(createUserController(service));
  });

  beforeEach(async () => {
    await truncateAll(sql);
  });

  afterAll(async () => {
    await sql.end();
  });

  describe("GET /api/users", () => {
    it("should return an empty list initially", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users")
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });
  });

  describe("POST /api/users", () => {
    it("should create a new user and return 201", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Alice",
            email: "alice@test.com",
            password: "secret123",
          }),
        })
      );
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe("Alice");
      expect(body.data.email).toBe("alice@test.com");
      expect(body.data).not.toHaveProperty("password");
    });

    it("should return 400 for invalid input", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "",
            email: "bad",
            password: "12",
          }),
        })
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should return 409 for duplicate email", async () => {
      // Create first user
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Alice",
            email: "alice@test.com",
            password: "secret123",
          }),
        })
      );

      // Try duplicate
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Alice 2",
            email: "alice@test.com",
            password: "secret456",
          }),
        })
      );
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.success).toBe(false);
    });
  });

  describe("GET /api/users/:id", () => {
    it("should return a user by id", async () => {
      // Create user first
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Bob",
            email: "bob@test.com",
            password: "secret123",
          }),
        })
      );

      const response = await app.handle(
        new Request("http://localhost/api/users/1")
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.name).toBe("Bob");
    });

    it("should return 404 for non-existent user", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/999")
      );
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
    });
  });

  describe("PUT /api/users/:id", () => {
    it("should update the user", async () => {
      // Create user
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Charlie",
            email: "charlie@test.com",
            password: "secret123",
          }),
        })
      );

      const response = await app.handle(
        new Request("http://localhost/api/users/1", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Charlie Updated" }),
        })
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.name).toBe("Charlie Updated");
    });
  });

  describe("DELETE /api/users/:id", () => {
    it("should delete the user and return 200", async () => {
      // Create user
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Dave",
            email: "dave@test.com",
            password: "secret123",
          }),
        })
      );

      const response = await app.handle(
        new Request("http://localhost/api/users/1", { method: "DELETE" })
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it("should return 404 when deleting non-existent user", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users/999", { method: "DELETE" })
      );
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
    });
  });
});
