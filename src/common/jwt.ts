/**
 * JWT utility — sign and verify JSON Web Tokens using `jose`.
 */

import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "jose";
import crypto from "crypto";

export interface TokenPayload extends JWTPayload {
  userId: number;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

/**
 * Create a JWT utility with the given secret and expiry settings.
 */
export function createJwtHelper(secret: string, accessExpirySeconds: number) {
  const encodedSecret = new TextEncoder().encode(secret);

  return {
    /**
     * Sign a new access token.
     */
    async signAccessToken(payload: { userId: number; email: string }): Promise<string> {
      return new SignJWT({ userId: payload.userId, email: payload.email })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${accessExpirySeconds}s`)
        .setSubject(String(payload.userId))
        .sign(encodedSecret);
    },

    /**
     * Verify and decode an access token.
     */
    async verifyAccessToken(token: string): Promise<TokenPayload> {
      const { payload } = await jwtVerify(token, encodedSecret);
      return payload as TokenPayload;
    },

    /**
     * Generate a cryptographically random refresh token.
     */
    generateRefreshToken(): string {
      return crypto.randomBytes(48).toString("base64url");
    },

    /**
     * Access token expiry in seconds (for API response).
     */
    get accessExpirySeconds(): number {
      return accessExpirySeconds;
    },
  };
}

export type JwtHelper = ReturnType<typeof createJwtHelper>;
