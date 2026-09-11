"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/auth/auth.service";
import {
  type ActionResult,
  failAction,
  okAction,
} from "@/shared/actions/result";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/modules/notifications/notification.service";

export type { ActionResult };

export async function markNotificationReadAction(input: {
  workspaceSlug: string;
  notificationId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await markNotificationRead(user.id, input.notificationId);
    revalidatePath(`/w/${input.workspaceSlug}/notifications`);
    revalidatePath(`/w/${input.workspaceSlug}`);
    return okAction();
  } catch (error) {
    return failAction(error, "notification_action_error");
  }
}

export async function markAllNotificationsReadAction(input: {
  workspaceId: string;
  workspaceSlug: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await markAllNotificationsRead(user.id, input.workspaceId);
    revalidatePath(`/w/${input.workspaceSlug}/notifications`);
    revalidatePath(`/w/${input.workspaceSlug}`);
    return okAction();
  } catch (error) {
    return failAction(error, "notification_action_error");
  }
}
