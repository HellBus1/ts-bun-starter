/**
 * Auth Service tests — business logic tested with mocked dependencies.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import { AuthService } from "../../src/services/auth.service";
import type { IUserRepository } from "../../src/repositories/user.repository";
import type { IRefreshTokenDao, RefreshToken } from "../../src/dao/refresh-token.dao";
import type { JwtHelper } from "../../src/common/jwt";
import type { User } from "../../src/models/user.model";
import { ValidationError, ConflictError, NotFoundError } from "../../src/common/errors";

const sampleUser: User = {
  id: 1,
  name: "Alice",
  email: "alice@test.com",
  password: "$2b$10$hashedpassword",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const sampleRefreshToken: RefreshToken = {
  id: 1,
  userId: 1,
  token: "valid-refresh-token",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  revoked: false,
  createdAt: "2026-01-01T00:00:00Z",
};

function createMockRepo(): IUserRepository {
  return {
    findAll: mock(() => Promise.resolve([])),
    findById: mock(() => Promise.resolve(null)),
    findByEmail: mock(() => Promise.resolve(null)),
    create: mock(() => Promise.resolve({ ...sampleUser })),
    update: mock(() => Promise.resolve(null)),
    deleteById: mock(() => Promise.resolve(false)),
  };
}

function createMockRefreshTokenDao(): IRefreshTokenDao {
  return {
    create: mock(() => Promise.resolve(sampleRefreshToken)),
    findByToken: mock(() => Promise.resolve(null)),
    revokeByToken: mock(() => Promise.resolve()),
    revokeAllByUserId: mock(() => Promise.resolve()),
  };
}

function createMockJwt(): JwtHelper {
  return {
    signAccessToken: mock(() => Promise.resolve("mock-access-token")),
    verifyAccessToken: mock(() => Promise.resolve({ userId: 1, email: "alice@test.com" })),
    generateRefreshToken: mock(() => "mock-refresh-token"),
    accessExpirySeconds: 900,
  };
}

describe("AuthService", () => {
  let authService: AuthService;
  let mockRepo: IUserRepository;
  let mockRefreshDao: IRefreshTokenDao;
  let mockJwt: JwtHelper;

  beforeEach(() => {
    mockRepo = createMockRepo();
    mockRefreshDao = createMockRefreshTokenDao();
    mockJwt = createMockJwt();
    authService = new AuthService(mockRepo, mockRefreshDao, mockJwt, 7);
  });

  describe("register", () => {
    it("should validate required fields", async () => {
      expect(
        authService.register({ name: "", email: "bad", password: "12" })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("should reject duplicate emails", async () => {
      (mockRepo.findByEmail as ReturnType<typeof mock>).mockResolvedValue(sampleUser);

      expect(
        authService.register({ name: "Bob", email: "alice@test.com", password: "secret123" })
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("should create user and return tokens", async () => {
      const result = await authService.register({
        name: "Alice",
        email: "alice@test.com",
        password: "secret123",
      });

      expect(result.user.name).toBe("Alice");
      expect(result.user).not.toHaveProperty("password");
      expect(result.tokens.accessToken).toBe("mock-access-token");
      expect(result.tokens.refreshToken).toBe("mock-refresh-token");
      expect(result.tokens.expiresIn).toBe(900);
      expect(mockRefreshDao.create).toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("should reject missing credentials", async () => {
      expect(authService.login("", "")).rejects.toBeInstanceOf(ValidationError);
    });

    it("should reject invalid email", async () => {
      (mockRepo.findByEmail as ReturnType<typeof mock>).mockResolvedValue(null);

      expect(
        authService.login("wrong@test.com", "password")
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("should reject invalid password", async () => {
      (mockRepo.findByEmail as ReturnType<typeof mock>).mockResolvedValue(sampleUser);
      // Bun.password.verify will return false for wrong password
      expect(
        authService.login("alice@test.com", "wrongpassword")
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("should return tokens on successful login", async () => {
      const hashedPassword = await Bun.password.hash("secret123", {
        algorithm: "bcrypt",
        cost: 10,
      });
      const userWithHash = { ...sampleUser, password: hashedPassword };
      (mockRepo.findByEmail as ReturnType<typeof mock>).mockResolvedValue(userWithHash);

      const result = await authService.login("alice@test.com", "secret123");

      expect(result.user.name).toBe("Alice");
      expect(result.user).not.toHaveProperty("password");
      expect(result.tokens.accessToken).toBe("mock-access-token");
    });
  });

  describe("refresh", () => {
    it("should reject empty refresh token", async () => {
      expect(authService.refresh("")).rejects.toBeInstanceOf(ValidationError);
    });

    it("should reject invalid refresh token", async () => {
      (mockRefreshDao.findByToken as ReturnType<typeof mock>).mockResolvedValue(null);

      expect(authService.refresh("invalid-token")).rejects.toBeInstanceOf(ValidationError);
    });

    it("should rotate tokens on valid refresh", async () => {
      (mockRefreshDao.findByToken as ReturnType<typeof mock>).mockResolvedValue(sampleRefreshToken);
      (mockRepo.findById as ReturnType<typeof mock>).mockResolvedValue(sampleUser);

      const tokens = await authService.refresh("valid-refresh-token");

      expect(tokens.accessToken).toBe("mock-access-token");
      expect(mockRefreshDao.revokeByToken).toHaveBeenCalledWith("valid-refresh-token");
    });
  });

  describe("logout", () => {
    it("should revoke the refresh token", async () => {
      await authService.logout("some-token");
      expect(mockRefreshDao.revokeByToken).toHaveBeenCalledWith("some-token");
    });
  });

  describe("getCurrentUser", () => {
    it("should throw NotFoundError for non-existent user", async () => {
      expect(authService.getCurrentUser(999)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should return user without password", async () => {
      (mockRepo.findById as ReturnType<typeof mock>).mockResolvedValue(sampleUser);

      const user = await authService.getCurrentUser(1);
      expect(user.name).toBe("Alice");
      expect(user).not.toHaveProperty("password");
    });
  });
});
