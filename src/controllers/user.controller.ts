/**
 * User Controller — REST route definitions.
 *
 * Defines CRUD endpoints under /api/users.
 * Delegates all business logic to UserService.
 */

import { Elysia, t } from "elysia";
import type { UserService } from "../services/user.service";
import type { ApiResponse } from "../common/types";
import type { UserResponse } from "../models/user.model";
import { ApiError, ValidationError } from "../common/errors";
import { Logger } from "../common/logger";

const logger = new Logger("UserController");

/**
 * Helper to handle errors and return structured JSON responses.
 */
function handleError(error: unknown, set: { status?: number | string }): ApiResponse<never> & { fields?: Record<string, string> } {
  if (error instanceof ValidationError) {
    set.status = error.statusCode;
    return {
      success: false,
      error: error.message,
      fields: error.fields,
    };
  }

  if (error instanceof ApiError) {
    set.status = error.statusCode;
    return {
      success: false,
      error: error.message,
    };
  }

  logger.error("Unhandled error", error as Error);
  set.status = 500;
  return {
    success: false,
    error: "Internal server error",
  };
}

export function createUserController(userService: UserService) {
  return new Elysia({ prefix: "/api/users" })
    /**
     * GET /api/users — List all users.
     */
    .get("/", async ({ set }) => {
      try {
        const users = await userService.getAllUsers();
        return { success: true, data: users } as ApiResponse<UserResponse[]>;
      } catch (error) {
        return handleError(error, set);
      }
    })

    /**
     * GET /api/users/:id — Get user by ID.
     */
    .get(
      "/:id",
      async ({ params, set }) => {
        try {
          const user = await userService.getUserById(Number(params.id));
          return { success: true, data: user } as ApiResponse<UserResponse>;
        } catch (error) {
          return handleError(error, set);
        }
      },
      {
        params: t.Object({
          id: t.String(),
        }),
      }
    )

    /**
     * POST /api/users — Create a new user.
     */
    .post(
      "/",
      async ({ body, set }) => {
        try {
          const user = await userService.createUser(body);
          set.status = 201;
          return { success: true, data: user, message: "User created successfully" } as ApiResponse<UserResponse>;
        } catch (error) {
          return handleError(error, set);
        }
      },
      {
        body: t.Object({
          name: t.String(),
          email: t.String(),
          password: t.String(),
        }),
      }
    )

    /**
     * PUT /api/users/:id — Update a user.
     */
    .put(
      "/:id",
      async ({ params, body, set }) => {
        try {
          const user = await userService.updateUser(Number(params.id), body);
          return { success: true, data: user, message: "User updated successfully" } as ApiResponse<UserResponse>;
        } catch (error) {
          return handleError(error, set);
        }
      },
      {
        params: t.Object({
          id: t.String(),
        }),
        body: t.Object({
          name: t.Optional(t.String()),
          email: t.Optional(t.String()),
          password: t.Optional(t.String()),
        }),
      }
    )

    /**
     * DELETE /api/users/:id — Delete a user.
     */
    .delete(
      "/:id",
      async ({ params, set }) => {
        try {
          await userService.deleteUser(Number(params.id));
          set.status = 200;
          return { success: true, message: "User deleted successfully" } as ApiResponse<null>;
        } catch (error) {
          return handleError(error, set);
        }
      },
      {
        params: t.Object({
          id: t.String(),
        }),
      }
    );
}
