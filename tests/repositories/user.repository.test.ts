/**
 * User Repository tests — tests the repository with a real PostgreSQL database.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import type { Sql } from "postgres";
import { UserRepository } from "../../src/repositories/user.repository";
import type { IUserDao } from "../../src/dao/user.dao";
import {
  createTestConnection,
  createTestUserDao,
  truncateAll,
  seedUsers,
} from "../helpers/test-utils";

describe("UserRepository", () => {
  let sql: Sql;
  let dao: IUserDao;
  let repository: UserRepository;

  beforeAll(() => {
    sql = createTestConnection();
    dao = createTestUserDao(sql);
    repository = new UserRepository(dao);
  });

  beforeEach(async () => {
    await truncateAll(sql);
  });

  afterAll(async () => {
    await sql.end();
  });

  describe("findAll", () => {
    it("should return all users", async () => {
      await seedUsers(dao);
      const users = await repository.findAll();
      expect(users).toHaveLength(3);
    });
  });

  describe("findById", () => {
    it("should return the user with the given id", async () => {
      await seedUsers(dao);
      const user = await repository.findById(1);
      expect(user).not.toBeNull();
      expect(user!.name).toBe("Alice");
    });

    it("should return null for non-existent id", async () => {
      const user = await repository.findById(999);
      expect(user).toBeNull();
    });
  });

  describe("findByEmail", () => {
    it("should return the user with the given email", async () => {
      await seedUsers(dao);
      const user = await repository.findByEmail("bob@test.com");
      expect(user).not.toBeNull();
      expect(user!.name).toBe("Bob");
    });
  });

  describe("create", () => {
    it("should create and return a new user", async () => {
      const user = await repository.create({
        name: "New User",
        email: "new@test.com",
        password: "hashed",
      });

      expect(user.id).toBe(1);
      expect(user.name).toBe("New User");
    });
  });

  describe("update", () => {
    it("should update and return the user", async () => {
      await seedUsers(dao);
      const updated = await repository.update(1, { name: "Updated Alice" });
      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("Updated Alice");
    });
  });

  describe("deleteById", () => {
    it("should delete the user and return true", async () => {
      await seedUsers(dao);
      const result = await repository.deleteById(1);
      expect(result).toBe(true);

      const user = await repository.findById(1);
      expect(user).toBeNull();
    });
  });
});
