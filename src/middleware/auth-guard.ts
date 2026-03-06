/**
 * Auth Guard middleware — protects routes with JWT verification.
 *
 * Extracts the Bearer token from the Authorization header,
 * verifies it, and attaches the decoded payload to the request context.
 */

import type { JwtHelper, TokenPayload } from "../common/jwt";

export interface AuthContext {
  userId: number;
  email: string;
}

/**
 * Extract and verify the Bearer token from the Authorization header.
 * Returns the decoded payload or null if invalid/missing.
 */
export async function extractAuth(
  authorization: string | undefined | null,
  jwt: JwtHelper
): Promise<AuthContext | null> {
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7);
  try {
    const payload: TokenPayload = await jwt.verifyAccessToken(token);
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}
