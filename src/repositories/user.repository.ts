/**
 * User Repository — abstracts data access behind an interface.
 *
 * The service layer depends on IUserRepository, not the concrete DAO.
 * This enables easy swapping of the underlying data source (e.g., Postgres, API).
 */

import type {
  User,
  CreateUserDto,
  UpdateUserDto,
} from "../models/user.model";
import type { IUserDao } from "../dao/user.dao";

/**
 * Repository interface — any data source implementation must follow this contract.
 */
export interface IUserRepository {
  findAll(): Promise<User[]>;
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserDto & { password: string }): Promise<User>;
  update(id: number, data: UpdateUserDto): Promise<User | null>;
  deleteById(id: number): Promise<boolean>;
}

/**
 * PostgreSQL-backed implementation.
 * Delegates to the async DAO layer.
 */
export class UserRepository implements IUserRepository {
  private dao: IUserDao;

  constructor(dao: IUserDao) {
    this.dao = dao;
  }

  async findAll(): Promise<User[]> {
    return this.dao.findAll();
  }

  async findById(id: number): Promise<User | null> {
    return this.dao.findById(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.dao.findByEmail(email);
  }

  async create(data: CreateUserDto & { password: string }): Promise<User> {
    return this.dao.create(data);
  }

  async update(id: number, data: UpdateUserDto): Promise<User | null> {
    return this.dao.update(id, data);
  }

  async deleteById(id: number): Promise<boolean> {
    return this.dao.deleteById(id);
  }
}
