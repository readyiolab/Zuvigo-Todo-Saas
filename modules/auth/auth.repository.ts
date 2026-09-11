import { query, execute, type PoolConnection } from "@/infrastructure/database/connection";
import { createId } from "@/shared/utils/id";
import { mapUser, type UserRow } from "@/modules/users/user.types";

export async function findUserByEmail(email: string) {
  const rows = await query<UserRow[]>(
    `SELECT * FROM tbl_users WHERE email = :email AND deleted_at IS NULL LIMIT 1`,
    { email: email.toLowerCase() }
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function findUserById(id: string) {
  const rows = await query<UserRow[]>(
    `SELECT * FROM tbl_users WHERE id = :id AND deleted_at IS NULL LIMIT 1`,
    { id }
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function createUser(
  input: {
    email: string;
    name: string;
    passwordHash: string;
  },
  conn?: PoolConnection
) {
  const id = createId();
  const sql = `
    INSERT INTO tbl_users (id, email, password_hash, name, status)
    VALUES (:id, :email, :passwordHash, :name, 'active')
  `;
  const params = {
    id,
    email: input.email.toLowerCase(),
    passwordHash: input.passwordHash,
    name: input.name,
  };

  if (conn) {
    await conn.execute(sql, params);
  } else {
    await execute(sql, params);
  }

  return id;
}

export async function insertSessionRecord(input: {
  id: string;
  userId: string;
  tokenHash: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt: Date;
}) {
  await execute(
    `INSERT INTO tbl_sessions (id, user_id, token_hash, user_agent, ip_address, expires_at)
     VALUES (:id, :userId, :tokenHash, :userAgent, :ipAddress, :expiresAt)`,
    {
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
      expiresAt: input.expiresAt,
    }
  );
}

export async function revokeSessionByTokenHash(tokenHash: string) {
  await execute(
    `UPDATE tbl_sessions SET revoked_at = CURRENT_TIMESTAMP(3)
     WHERE token_hash = :tokenHash AND revoked_at IS NULL`,
    { tokenHash }
  );
}
