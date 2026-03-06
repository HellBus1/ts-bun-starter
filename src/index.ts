/**
 * Application Bootstrap
 *
 * Initializes the DI container, wires all layers together, and starts the server.
 * This is the composition root — the only place where concrete implementations are referenced.
 */

import { Elysia } from "elysia";
import { Container } from "./container/container";
import { loadConfig } from "./config/config";
import { DatabaseManager } from "./database/database";
import { createUserDao, type IUserDao } from "./dao/user.dao";
import { UserRepository } from "./repositories/user.repository";
import { UserService } from "./services/user.service";
import { createUserController } from "./controllers/user.controller";
import { errorHandler } from "./middleware/error-handler";
import { requestLogger } from "./middleware/request-logger";
import { Logger } from "./common/logger";

const logger = new Logger("App");

// ---------------------------------------------------------------------------
// 1. Load configuration
// ---------------------------------------------------------------------------
const config = loadConfig();

// ---------------------------------------------------------------------------
// 2. Create DI container & register dependencies
// ---------------------------------------------------------------------------
const container = new Container();

// Config
container.registerInstance("config", config);

// Database
container.registerSingleton(
  "database",
  () => new DatabaseManager(config.db)
);

// DAO layer
container.registerSingleton(
  "userDao",
  (c) => createUserDao(c.resolve<DatabaseManager>("database").getConnection())
);

// Repository layer
container.registerSingleton(
  "userRepository",
  (c) => new UserRepository(c.resolve<IUserDao>("userDao"))
);

// Service layer
container.registerSingleton(
  "userService",
  (c) => new UserService(c.resolve<UserRepository>("userRepository"))
);

// ---------------------------------------------------------------------------
// 3. Create Elysia app with middleware & controllers
// ---------------------------------------------------------------------------
const userService = container.resolve<UserService>("userService");

const app = new Elysia()
  .use(errorHandler)
  .use(requestLogger)
  .get("/", () => ({
    success: true,
    message: "🚀 ts-bun-starter is running!",
    docs: "/api/users",
  }))
  .get("/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }))
  .use(createUserController(userService))
  .listen(config.port);

logger.info(`Server started`, {
  port: config.port,
  env: config.nodeEnv,
  url: `http://localhost:${config.port}`,
});

// ---------------------------------------------------------------------------
// 4. Graceful shutdown
// ---------------------------------------------------------------------------
process.on("SIGINT", async () => {
  logger.info("Shutting down...");
  await container.resolve<DatabaseManager>("database").close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down...");
  await container.resolve<DatabaseManager>("database").close();
  process.exit(0);
});

export { app, container };
