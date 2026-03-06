/**
 * Shared test utilities.
 *
 * Connects to a real PostgreSQL test database.
 * Requires Docker (PostgreSQL) to be running: `bun run db:up`
 */

import postgres from "postgres";
import type { Sql } from "postgres";
import { createUserDao, type IUserDao } from "../../src/dao/user.dao";

/**
 * Create a connection to the test PostgreSQL database.
 */
export function createTestConnection(): Sql {
  return postgres({
    host: Bun.env.DB_HOST ?? "localhost",
    port: parseInt(Bun.env.DB_PORT ?? "5432", 10),
    database: Bun.env.TEST_DB_NAME ?? "ts_bun_starter_test",
    username: Bun.env.DB_USER ?? "postgres",
    password: Bun.env.DB_PASSWORD ?? "postgres",
    max: 5,
  });
}

/**
 * Truncate all application tables (preserves Liquibase metadata).
 */
export async function truncateAll(sql: Sql): Promise<void> {
  await sql`TRUNCATE TABLE refresh_tokens, users RESTART IDENTITY CASCADE`;
}

/**
 * Creates a fresh UserDao backed by the test database.
 */
export function createTestUserDao(sql: Sql): IUserDao {
  return createUserDao(sql);
}

/**
 * Seed the database with sample users for testing.
 */
export async function seedUsers(dao: IUserDao): Promise<void> {
  await dao.create({ name: "Alice", email: "alice@test.com", password: "hashed_pw_1" });
  await dao.create({ name: "Bob", email: "bob@test.com", password: "hashed_pw_2" });
  await dao.create({ name: "Charlie", email: "charlie@test.com", password: "hashed_pw_3" });
}
