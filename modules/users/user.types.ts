import type { RowDataPacket } from "mysql2";

export type UserStatus = "active" | "disabled";

export type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type UserRow = RowDataPacket & {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  avatar_url: string | null;
  status: UserStatus;
  email_verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export function mapUser(row: UserRow): User & { passwordHash: string } {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    status: row.status,
    emailVerifiedAt: row.email_verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    passwordHash: row.password_hash,
  };
}

export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    status: user.status,
  };
}
