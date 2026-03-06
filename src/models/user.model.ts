/**
 * User entity and DTO types.
 */

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * User without sensitive fields (for API responses).
 */
export type UserResponse = Omit<User, "password">;

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
}
