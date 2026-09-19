import { execute } from "@/infrastructure/database/connection";
import { findUserById, findUserByEmail } from "@/modules/auth/auth.repository";
import type { User } from "@/modules/users/user.types";

export { findUserById, findUserByEmail, type User };

export async function updateUserData(record: {
  userId: string;
  name: string;
  email: string | null;
}): Promise<void> {
  await execute(
    `UPDATE tbl_users
     SET name = :name,
         email = COALESCE(:email, email)
     WHERE id = :userId AND deleted_at IS NULL`,
    record
  );
}
