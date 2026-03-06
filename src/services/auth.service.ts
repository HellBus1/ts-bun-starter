/**
 * Auth Service — handles authentication logic.
 *
 * Register, login, token refresh, and logout.
 */

import type { IUserRepository } from "../repositories/user.repository";
import type { IRefreshTokenDao } from "../dao/refresh-token.dao";
import type { JwtHelper, AuthTokens } from "../common/jwt";
import type { UserResponse, CreateUserDto } from "../models/user.model";
import {
  ValidationError,
  ConflictError,
  NotFoundError,
} from "../common/errors";
import { Logger } from "../common/logger";

const logger = new Logger("AuthService");

export class AuthService {
  private userRepository: IUserRepository;
  private refreshTokenDao: IRefreshTokenDao;
  private jwt: JwtHelper;
  private refreshExpiryDays: number;

  constructor(
    userRepository: IUserRepository,
    refreshTokenDao: IRefreshTokenDao,
    jwt: JwtHelper,
    refreshExpiryDays: number = 7
  ) {
    this.userRepository = userRepository;
    this.refreshTokenDao = refreshTokenDao;
    this.jwt = jwt;
    this.refreshExpiryDays = refreshExpiryDays;
  }

  /**
   * Register a new user and return auth tokens.
   */
  async register(dto: CreateUserDto): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    this.validateRegistration(dto);

    const existing = await this.userRepository.findByEmail(dto.email.toLowerCase());
    if (existing) {
      throw new ConflictError(`User with email "${dto.email}" already exists`);
    }

    const hashedPassword = await Bun.password.hash(dto.password, {
      algorithm: "bcrypt",
      cost: 10,
    });

    const user = await this.userRepository.create({
      ...dto,
      email: dto.email.toLowerCase(),
      password: hashedPassword,
    });

    const tokens = await this.generateTokens(user.id, user.email);
    logger.info("User registered", { userId: user.id, email: user.email });

    const { password: _, ...userResponse } = user;
    return { user: userResponse, tokens };
  }

  /**
   * Authenticate with email + password, return auth tokens.
   */
  async login(email: string, password: string): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    if (!email || !password) {
      throw new ValidationError("Validation failed", {
        email: !email ? "Email is required" : "",
        password: !password ? "Password is required" : "",
      });
    }

    const user = await this.userRepository.findByEmail(email.toLowerCase());
    if (!user) {
      throw new ValidationError("Invalid email or password");
    }

    const isValid = await Bun.password.verify(password, user.password);
    if (!isValid) {
      throw new ValidationError("Invalid email or password");
    }

    const tokens = await this.generateTokens(user.id, user.email);
    logger.info("User logged in", { userId: user.id });

    const { password: _, ...userResponse } = user;
    return { user: userResponse, tokens };
  }

  /**
   * Refresh tokens using a valid refresh token.
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    if (!refreshToken) {
      throw new ValidationError("Refresh token is required");
    }

    const stored = await this.refreshTokenDao.findByToken(refreshToken);
    if (!stored) {
      throw new ValidationError("Invalid or expired refresh token");
    }

    // Revoke the used refresh token (rotation)
    await this.refreshTokenDao.revokeByToken(refreshToken);

    const user = await this.userRepository.findById(stored.userId);
    if (!user) {
      throw new NotFoundError("User", stored.userId);
    }

    const tokens = await this.generateTokens(user.id, user.email);
    logger.info("Token refreshed", { userId: user.id });
    return tokens;
  }

  /**
   * Logout — revoke the refresh token.
   */
  async logout(refreshToken: string): Promise<void> {
    if (refreshToken) {
      await this.refreshTokenDao.revokeByToken(refreshToken);
    }
    logger.info("User logged out");
  }

  /**
   * Get current user by ID (from JWT).
   */
  async getCurrentUser(userId: number): Promise<UserResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User", userId);
    }
    const { password: _, ...userResponse } = user;
    return userResponse;
  }

  private async generateTokens(userId: number, email: string): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAccessToken({ userId, email });
    const refreshToken = this.jwt.generateRefreshToken();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshExpiryDays);

    await this.refreshTokenDao.create(userId, refreshToken, expiresAt);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.jwt.accessExpirySeconds,
    };
  }

  private validateRegistration(dto: CreateUserDto): void {
    const errors: Record<string, string> = {};

    if (!dto.name || dto.name.trim().length === 0) {
      errors.name = "Name is required";
    }
    if (!dto.email || !dto.email.includes("@")) {
      errors.email = "A valid email is required";
    }
    if (!dto.password || dto.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError("Validation failed", errors);
    }
  }
}
