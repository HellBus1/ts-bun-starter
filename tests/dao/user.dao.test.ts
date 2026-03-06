/**
 * User DAO tests — tests against a real PostgreSQL test database.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import type { Sql } from "postgres";
import type { IUserDao } from "../../src/dao/user.dao";
import {
  createTestConnection,
  createTestUserDao,
  truncateAll,
  seedUsers,
} from "../helpers/test-utils";

describe("UserDao", () => {
  let sql: Sql;
  let dao: IUserDao;

  beforeAll(() => {
    sql = createTestConnection();
    dao = createTestUserDao(sql);
  });

  beforeEach(async () => {
    await truncateAll(sql);
  });

  afterAll(async () => {
    await sql.end();
  });

  describe("create", () => {
    it("should insert a new user and return it with an id", async () => {
      const user = await dao.create({
        name: "John",
        email: "john@test.com",
        password: "hashed_pw",
      });

      expect(user.id).toBe(1);
      expect(user.name).toBe("John");
      expect(user.email).toBe("john@test.com");
      expect(user.password).toBe("hashed_pw");
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it("should enforce unique email constraint", async () => {
      await dao.create({ name: "A", email: "dup@test.com", password: "pw" });

      expect(
        dao.create({ name: "B", email: "dup@test.com", password: "pw" })
      ).rejects.toThrow();
    });
  });

  describe("findAll", () => {
    it("should return an empty array when no users exist", async () => {
      const result = await dao.findAll();
      expect(result).toEqual([]);
    });

    it("should return all users ordered by id", async () => {
      await seedUsers(dao);
      const users = await dao.findAll();

      expect(users).toHaveLength(3);
      expect(users[0].name).toBe("Alice");
      expect(users[1].name).toBe("Bob");
      expect(users[2].name).toBe("Charlie");
    });
  });

  describe("findById", () => {
    it("should return the user with the given id", async () => {
      await seedUsers(dao);
      const user = await dao.findById(2);

      expect(user).not.toBeNull();
      expect(user!.name).toBe("Bob");
    });

    it("should return null for a non-existent id", async () => {
      const user = await dao.findById(999);
      expect(user).toBeNull();
    });
  });

  describe("findByEmail", () => {
    it("should return the user with the given email", async () => {
      await seedUsers(dao);
      const user = await dao.findByEmail("alice@test.com");

      expect(user).not.toBeNull();
      expect(user!.name).toBe("Alice");
    });

    it("should return null for a non-existent email", async () => {
      const user = await dao.findByEmail("nope@test.com");
      expect(user).toBeNull();
    });
  });

  describe("update", () => {
    it("should update specified fields and return the updated user", async () => {
      await seedUsers(dao);
      const updated = await dao.update(1, { name: "Alice Updated" });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("Alice Updated");
      expect(updated!.email).toBe("alice@test.com"); // unchanged
    });

    it("should return null when updating a non-existent user", async () => {
      const result = await dao.update(999, { name: "Ghost" });
      expect(result).toBeNull();
    });

    it("should return user unchanged when no fields are provided", async () => {
      await seedUsers(dao);
      const original = await dao.findById(1);
      const updated = await dao.update(1, {});

      expect(updated!.name).toBe(original!.name);
    });
  });

  describe("deleteById", () => {
    it("should delete the user and return true", async () => {
      await seedUsers(dao);
      const result = await dao.deleteById(1);

      expect(result).toBe(true);
      const user = await dao.findById(1);
      expect(user).toBeNull();
    });

    it("should return false for a non-existent user", async () => {
      const result = await dao.deleteById(999);
      expect(result).toBe(false);
    });
  });
});
