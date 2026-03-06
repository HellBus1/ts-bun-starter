/**
 * User Data Access Object — handles raw PostgreSQL operations.
 *
 * Uses postgresjs tagged template queries.
 * All methods are async since PostgreSQL queries return Promises.
 * Schema is managed by Liquibase — no DDL here.
 */

import type { Sql } from "postgres";
import type { User, CreateUserDto, UpdateUserDto } from "../models/user.model";

export interface IUserDao {
  findAll(): Promise<User[]>;
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserDto & { password: string }): Promise<User>;
  update(id: number, data: UpdateUserDto): Promise<User | null>;
  deleteById(id: number): Promise<boolean>;
}

/**
 * Raw row shape from PostgreSQL (snake_case columns).
 */
interface RawUserRow {
  id: number;
  name: string;
  email: string;
  password: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: RawUserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Create a User DAO backed by the given PostgreSQL connection.
 */
export function createUserDao(sql: Sql): IUserDao {
  return {
    async findAll(): Promise<User[]> {
      const rows = await sql<RawUserRow[]>`
        SELECT * FROM users ORDER BY id ASC
      `;
      return rows.map(mapRow);
    },

    async findById(id: number): Promise<User | null> {
      const rows = await sql<RawUserRow[]>`
        SELECT * FROM users WHERE id = ${id}
      `;
      return rows.length > 0 ? mapRow(rows[0]) : null;
    },

    async findByEmail(email: string): Promise<User | null> {
      const rows = await sql<RawUserRow[]>`
        SELECT * FROM users WHERE email = ${email}
      `;
      return rows.length > 0 ? mapRow(rows[0]) : null;
    },

    async create(data: CreateUserDto & { password: string }): Promise<User> {
      const rows = await sql<RawUserRow[]>`
        INSERT INTO users (name, email, password)
        VALUES (${data.name}, ${data.email}, ${data.password})
        RETURNING *
      `;
      return mapRow(rows[0]);
    },

    async update(id: number, data: UpdateUserDto): Promise<User | null> {
      // Build dynamic SET using postgresjs helpers
      const sets: string[] = [];
      const values: Record<string, unknown> = {};

      if (data.name !== undefined) {
        values.name = data.name;
      }
      if (data.email !== undefined) {
        values.email = data.email;
      }
      if (data.password !== undefined) {
        values.password = data.password;
      }

      if (Object.keys(values).length === 0) {
        return this.findById(id);
      }

      // Use postgresjs dynamic helper for SET clause
      const rows = await sql<RawUserRow[]>`
        UPDATE users SET ${sql(values, ...Object.keys(values))}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      return rows.length > 0 ? mapRow(rows[0]) : null;
    },

    async deleteById(id: number): Promise<boolean> {
      const result = await sql`
        DELETE FROM users WHERE id = ${id}
      `;
      return result.count > 0;
    },
  };
}
