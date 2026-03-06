/**
 * Global error handling middleware for Elysia.
 * Catches ApiError subclasses and returns structured JSON responses.
 */

import { Elysia } from "elysia";
import { ApiError, ValidationError } from "../common/errors";
import { Logger } from "../common/logger";
import type { ApiResponse } from "../common/types";

const logger = new Logger("ErrorHandler");

export const errorHandler = new Elysia({ name: "error-handler" }).onError(
  ({ error, set }) => {
    if (error instanceof ValidationError) {
      set.status = error.statusCode;
      return {
        success: false,
        error: error.message,
        fields: error.fields,
      } as ApiResponse<never> & { fields: Record<string, string> };
    }

    if (error instanceof ApiError) {
      set.status = error.statusCode;
      return {
        success: false,
        error: error.message,
      } as ApiResponse<never>;
    }

    // Unexpected errors
    logger.error("Unhandled error", error as Error);
    set.status = 500;
    return {
      success: false,
      error: "Internal server error",
    } as ApiResponse<never>;
  }
);
