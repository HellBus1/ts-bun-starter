/**
 * Refresh Token DAO — handles refresh token persistence in PostgreSQL.
 */

import type { Sql } from "postgres";

export interface RefreshToken {
  id: number;
  userId: number;
  token: string;
  expiresAt: string;
  revoked: boolean;
  createdAt: string;
}

interface RawRefreshTokenRow {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  revoked: boolean;
  created_at: string;
}

export interface IRefreshTokenDao {
  create(userId: number, token: string, expiresAt: Date): Promise<RefreshToken>;
  findByToken(token: string): Promise<RefreshToken | null>;
  revokeByToken(token: string): Promise<void>;
  revokeAllByUserId(userId: number): Promise<void>;
}

function mapRow(row: RawRefreshTokenRow): RefreshToken {
  return {
    id: row.id,
    userId: row.user_id,
    token: row.token,
    expiresAt: row.expires_at,
    revoked: row.revoked,
    createdAt: row.created_at,
  };
}

export function createRefreshTokenDao(sql: Sql): IRefreshTokenDao {
  return {
    async create(userId: number, token: string, expiresAt: Date): Promise<RefreshToken> {
      const rows = await sql<RawRefreshTokenRow[]>`
        INSERT INTO refresh_tokens (user_id, token, expires_at)
        VALUES (${userId}, ${token}, ${expiresAt.toISOString()})
        RETURNING *
      `;
      return mapRow(rows[0]);
    },

    async findByToken(token: string): Promise<RefreshToken | null> {
      const rows = await sql<RawRefreshTokenRow[]>`
        SELECT * FROM refresh_tokens
        WHERE token = ${token} AND revoked = false AND expires_at > NOW()
      `;
      return rows.length > 0 ? mapRow(rows[0]) : null;
    },

    async revokeByToken(token: string): Promise<void> {
      await sql`UPDATE refresh_tokens SET revoked = true WHERE token = ${token}`;
    },

    async revokeAllByUserId(userId: number): Promise<void> {
      await sql`UPDATE refresh_tokens SET revoked = true WHERE user_id = ${userId}`;
    },
  };
}
