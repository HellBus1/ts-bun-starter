/**
 * Application configuration.
 * Reads from environment variables (auto-loaded by Bun from .env).
 */

export interface AppConfig {
  port: number;
  nodeEnv: string;
  logLevel: string;
  db: DatabaseConfig;
  jwt: JwtConfig;
}

export interface JwtConfig {
  secret: string;
  accessExpirySeconds: number;
  refreshExpiryDays: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export function loadConfig(): AppConfig {
  return {
    port: parseInt(Bun.env.PORT ?? "3000", 10),
    nodeEnv: Bun.env.NODE_ENV ?? "development",
    logLevel: Bun.env.LOG_LEVEL ?? "info",
    db: {
      host: Bun.env.DB_HOST ?? "localhost",
      port: parseInt(Bun.env.DB_PORT ?? "5432", 10),
      database: Bun.env.DB_NAME ?? "ts_bun_starter",
      username: Bun.env.DB_USER ?? "postgres",
      password: Bun.env.DB_PASSWORD ?? "postgres",
    },
    jwt: {
      secret: Bun.env.JWT_SECRET ?? "change-me-in-production",
      accessExpirySeconds: parseInt(Bun.env.JWT_ACCESS_EXPIRY_SECONDS ?? "900", 10),
      refreshExpiryDays: parseInt(Bun.env.JWT_REFRESH_EXPIRY_DAYS ?? "7", 10),
    },
  };
}
