import { execute } from "@/infrastructure/database/connection";
import {
  findUserByEmail,
  findUserById,
} from "@/modules/auth/auth.repository";
import { updateProfileSchema } from "@/modules/users/user.schema";
import { toPublicUser } from "@/modules/users/user.types";
import {
  conflictError,
  notFoundError,
  validationError,
} from "@/shared/errors";

export async function updateUserProfile(userId: string, raw: unknown) {
  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid profile", parsed.error.flatten());
  }

  const user = await findUserById(userId);
  if (!user) throw notFoundError("User not found");

  if (parsed.data.email && parsed.data.email.toLowerCase() !== user.email) {
    const existing = await findUserByEmail(parsed.data.email);
    if (existing && existing.id !== userId) {
      throw conflictError("Email is already in use");
    }
  }

  await execute(
    `UPDATE tbl_users
     SET name = :name,
         email = COALESCE(:email, email)
     WHERE id = :userId AND deleted_at IS NULL`,
    {
      userId,
      name: parsed.data.name,
      email: parsed.data.email?.toLowerCase() ?? null,
    }
  );

  const updated = await findUserById(userId);
  if (!updated) throw notFoundError("User not found");
  return toPublicUser(updated);
}
