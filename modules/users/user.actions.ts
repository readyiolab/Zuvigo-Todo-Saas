"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/auth/auth.service";
import {
  type ActionResult,
  failAction,
  okAction,
} from "@/shared/actions/result";
import { updateUserProfile } from "@/modules/users/user.service";

export type { ActionResult };

export async function updateProfileAction(input: {
  name: string;
  email?: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = await updateUserProfile(user.id, input);
    revalidatePath("/w");
    return okAction(data);
  } catch (error) {
    return failAction(error, "user_action_error");
  }
}
