/**
 * Request logging middleware for Elysia.
 * Logs method, path, status code, and response time.
 */

import { Elysia } from "elysia";
import { Logger } from "../common/logger";

const logger = new Logger("HTTP");

export const requestLogger = new Elysia({ name: "request-logger" })
  .derive(({ request }) => {
    return {
      requestStartTime: performance.now(),
      requestMethod: request.method,
      requestPath: new URL(request.url).pathname,
    };
  })
  .onAfterResponse(
    ({ requestStartTime, requestMethod, requestPath, set }) => {
      const duration = (performance.now() - requestStartTime).toFixed(2);
      logger.info(`${requestMethod} ${requestPath}`, {
        status: set.status ?? 200,
        duration: `${duration}ms`,
      });
    }
  );
