/**
 * Database connection manager using postgres (postgresjs).
 *
 * Provides a shared Sql connection pool for DAO layers.
 * Connection pooling is built into the postgres package.
 */

import postgres from "postgres";
import type { Sql } from "postgres";
import type { DatabaseConfig } from "../config/config";
import { Logger } from "../common/logger";

const logger = new Logger("Database");

export class DatabaseManager {
  private sql: Sql;

  constructor(config: DatabaseConfig) {
    this.sql = postgres({
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      password: config.password,
      max: 20, // max pool connections
      idle_timeout: 20,
      connect_timeout: 10,
    });

    logger.info("Database pool created", {
      host: config.host,
      port: config.port,
      database: config.database,
    });
  }

  /**
   * Get the underlying Sql instance for DAO usage.
   */
  getConnection(): Sql {
    return this.sql;
  }

  /**
   * Close all connections in the pool.
   */
  async close(): Promise<void> {
    await this.sql.end();
    logger.info("Database connections closed");
  }
}
