/**
 * Auth Controller — REST route definitions for authentication.
 *
 * POST /api/auth/register  — register a new user
 * POST /api/auth/login     — login with email + password
 * POST /api/auth/refresh   — refresh access token
 * POST /api/auth/logout    — revoke refresh token
 * GET  /api/auth/me        — get current user (protected)
 */

import { Elysia, t } from "elysia";
import type { AuthService } from "../services/auth.service";
import type { JwtHelper } from "../common/jwt";
import type { ApiResponse } from "../common/types";
import { ApiError, ValidationError } from "../common/errors";
import { extractAuth } from "../middleware/auth-guard";
import { Logger } from "../common/logger";

const logger = new Logger("AuthController");

function handleError(error: unknown, set: { status?: number | string }) {
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

export function createAuthController(authService: AuthService, jwt: JwtHelper) {
  return new Elysia({ prefix: "/api/auth" })

    /**
     * POST /api/auth/register
     */
    .post(
      "/register",
      async ({ body, set }) => {
        try {
          const result = await authService.register(body);
          set.status = 201;
          return {
            success: true,
            data: {
              user: result.user,
              ...result.tokens,
            },
            message: "Registration successful",
          };
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
     * POST /api/auth/login
     */
    .post(
      "/login",
      async ({ body, set }) => {
        try {
          const result = await authService.login(body.email, body.password);
          return {
            success: true,
            data: {
              user: result.user,
              ...result.tokens,
            },
            message: "Login successful",
          };
        } catch (error) {
          return handleError(error, set);
        }
      },
      {
        body: t.Object({
          email: t.String(),
          password: t.String(),
        }),
      }
    )

    /**
     * POST /api/auth/refresh
     */
    .post(
      "/refresh",
      async ({ body, set }) => {
        try {
          const tokens = await authService.refresh(body.refreshToken);
          return {
            success: true,
            data: tokens,
            message: "Token refreshed",
          };
        } catch (error) {
          return handleError(error, set);
        }
      },
      {
        body: t.Object({
          refreshToken: t.String(),
        }),
      }
    )

    /**
     * POST /api/auth/logout
     */
    .post(
      "/logout",
      async ({ body, set }) => {
        try {
          await authService.logout(body.refreshToken);
          return {
            success: true,
            message: "Logged out successfully",
          };
        } catch (error) {
          return handleError(error, set);
        }
      },
      {
        body: t.Object({
          refreshToken: t.String(),
        }),
      }
    )

    /**
     * GET /api/auth/me — protected route
     */
    .get("/me", async ({ headers, set }) => {
      try {
        const auth = await extractAuth(headers.authorization, jwt);
        if (!auth) {
          set.status = 401;
          return {
            success: false,
            error: "Unauthorized — invalid or missing token",
          } as ApiResponse<never>;
        }

        const user = await authService.getCurrentUser(auth.userId);
        return {
          success: true,
          data: user,
        };
      } catch (error) {
        return handleError(error, set);
      }
    });
}
