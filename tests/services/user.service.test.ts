/**
 * User Service tests — business logic tested with a mocked repository.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import { UserService } from "../../src/services/user.service";
import type { IUserRepository } from "../../src/repositories/user.repository";
import type { User } from "../../src/models/user.model";
import { NotFoundError, ValidationError, ConflictError } from "../../src/common/errors";

/**
 * Creates a mock repository where each method is a mock function.
 */
function createMockRepository(): IUserRepository {
  return {
    findAll: mock(() => Promise.resolve([])),
    findById: mock(() => Promise.resolve(null)),
    findByEmail: mock(() => Promise.resolve(null)),
    create: mock(() => Promise.resolve({} as User)),
    update: mock(() => Promise.resolve(null)),
    deleteById: mock(() => Promise.resolve(false)),
  };
}

const sampleUser: User = {
  id: 1,
  name: "Alice",
  email: "alice@test.com",
  password: "hashed_password",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("UserService", () => {
  let service: UserService;
  let mockRepo: IUserRepository;

  beforeEach(() => {
    mockRepo = createMockRepository();
    service = new UserService(mockRepo);
  });

  describe("getAllUsers", () => {
    it("should return users without password field", async () => {
      (mockRepo.findAll as ReturnType<typeof mock>).mockResolvedValue([sampleUser]);

      const users = await service.getAllUsers();

      expect(users).toHaveLength(1);
      expect(users[0]).not.toHaveProperty("password");
      expect(users[0].name).toBe("Alice");
    });
  });

  describe("getUserById", () => {
    it("should return the user without password", async () => {
      (mockRepo.findById as ReturnType<typeof mock>).mockResolvedValue(sampleUser);

      const user = await service.getUserById(1);

      expect(user.name).toBe("Alice");
      expect(user).not.toHaveProperty("password");
    });

    it("should throw NotFoundError for non-existent user", async () => {
      (mockRepo.findById as ReturnType<typeof mock>).mockResolvedValue(null);

      expect(service.getUserById(999)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("createUser", () => {
    it("should validate required fields", async () => {
      expect(
        service.createUser({ name: "", email: "bad", password: "12" })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("should reject duplicate emails", async () => {
      (mockRepo.findByEmail as ReturnType<typeof mock>).mockResolvedValue(sampleUser);

      expect(
        service.createUser({
          name: "Bob",
          email: "alice@test.com",
          password: "password123",
        })
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("should hash the password and create a user", async () => {
      (mockRepo.findByEmail as ReturnType<typeof mock>).mockResolvedValue(null);
      (mockRepo.create as ReturnType<typeof mock>).mockImplementation(
        async (data: { name: string; email: string; password: string }) => ({
          ...sampleUser,
          name: data.name,
          email: data.email,
          password: data.password,
        })
      );

      const result = await service.createUser({
        name: "Bob",
        email: "bob@test.com",
        password: "secret123",
      });

      expect(result.name).toBe("Bob");
      expect(result).not.toHaveProperty("password");

      // Verify the repo received a hashed password (not the plaintext)
      const createCall = (mockRepo.create as ReturnType<typeof mock>).mock.calls[0];
      expect(createCall[0].password).not.toBe("secret123");
    });
  });

  describe("updateUser", () => {
    it("should throw NotFoundError for non-existent user", async () => {
      (mockRepo.findById as ReturnType<typeof mock>).mockResolvedValue(null);

      expect(
        service.updateUser(999, { name: "Ghost" })
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should update user and return without password", async () => {
      const updatedUser = { ...sampleUser, name: "Alice Updated" };
      (mockRepo.findById as ReturnType<typeof mock>).mockResolvedValue(sampleUser);
      (mockRepo.update as ReturnType<typeof mock>).mockResolvedValue(updatedUser);

      const result = await service.updateUser(1, { name: "Alice Updated" });

      expect(result.name).toBe("Alice Updated");
      expect(result).not.toHaveProperty("password");
    });
  });

  describe("deleteUser", () => {
    it("should throw NotFoundError for non-existent user", async () => {
      (mockRepo.findById as ReturnType<typeof mock>).mockResolvedValue(null);

      expect(service.deleteUser(999)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should delete the user successfully", async () => {
      (mockRepo.findById as ReturnType<typeof mock>).mockResolvedValue(sampleUser);
      (mockRepo.deleteById as ReturnType<typeof mock>).mockResolvedValue(true);

      await service.deleteUser(1); // should not throw

      expect(mockRepo.deleteById).toHaveBeenCalledWith(1);
    });
  });
});
