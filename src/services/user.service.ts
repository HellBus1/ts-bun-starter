/**
 * User Service — business logic layer.
 *
 * Handles validation, password hashing, and data transformation.
 * Depends on IUserRepository (injected via DI container).
 */

import type { IUserRepository } from "../repositories/user.repository";
import type {
  User,
  UserResponse,
  CreateUserDto,
  UpdateUserDto,
} from "../models/user.model";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../common/errors";
import { Logger } from "../common/logger";

const logger = new Logger("UserService");

export class UserService {
  private userRepository: IUserRepository;

  constructor(userRepository: IUserRepository) {
    this.userRepository = userRepository;
  }

  async getAllUsers(): Promise<UserResponse[]> {
    const users = await this.userRepository.findAll();
    return users.map(this.toResponse);
  }

  async getUserById(id: number): Promise<UserResponse> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError("User", id);
    }
    return this.toResponse(user);
  }

  async createUser(dto: CreateUserDto): Promise<UserResponse> {
    // Validate input
    this.validateCreateDto(dto);

    // Check for duplicate email
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError(`User with email "${dto.email}" already exists`);
    }

    // Hash password
    const hashedPassword = await Bun.password.hash(dto.password, {
      algorithm: "bcrypt",
      cost: 10,
    });

    const user = await this.userRepository.create({
      ...dto,
      password: hashedPassword,
    });

    logger.info("User created", { userId: user.id, email: user.email });
    return this.toResponse(user);
  }

  async updateUser(id: number, dto: UpdateUserDto): Promise<UserResponse> {
    // Validate input
    this.validateUpdateDto(dto);

    // Check user exists
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("User", id);
    }

    // Check duplicate email if email is being changed
    if (dto.email && dto.email !== existing.email) {
      const emailTaken = await this.userRepository.findByEmail(dto.email);
      if (emailTaken) {
        throw new ConflictError(
          `User with email "${dto.email}" already exists`
        );
      }
    }

    // Hash password if being updated
    const updateData: UpdateUserDto = { ...dto };
    if (dto.password) {
      updateData.password = await Bun.password.hash(dto.password, {
        algorithm: "bcrypt",
        cost: 10,
      });
    }

    const updated = await this.userRepository.update(id, updateData);
    if (!updated) {
      throw new NotFoundError("User", id);
    }

    logger.info("User updated", { userId: id });
    return this.toResponse(updated);
  }

  async deleteUser(id: number): Promise<void> {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("User", id);
    }

    await this.userRepository.deleteById(id);
    logger.info("User deleted", { userId: id });
  }

  /**
   * Strip the password field from a User entity.
   */
  private toResponse(user: User): UserResponse {
    const { password: _, ...response } = user;
    return response;
  }

  private validateCreateDto(dto: CreateUserDto): void {
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

  private validateUpdateDto(dto: UpdateUserDto): void {
    const errors: Record<string, string> = {};

    if (dto.name !== undefined && dto.name.trim().length === 0) {
      errors.name = "Name cannot be empty";
    }
    if (dto.email !== undefined && !dto.email.includes("@")) {
      errors.email = "A valid email is required";
    }
    if (dto.password !== undefined && dto.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError("Validation failed", errors);
    }
  }
}
