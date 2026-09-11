"use server";

import { requireUser } from "@/modules/auth/auth.service";
import { listActivityForResource } from "@/modules/activity/activity.service";
import {
  type ActionResult,
  failAction,
  okAction,
} from "@/shared/actions/result";

export async function listActivityForResourceAction(input: {
  workspaceId: string;
  resourceType: string;
  resourceId: string;
  limit?: number;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const items = await listActivityForResource({
      workspaceId: input.workspaceId,
      userId: user.id,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      limit: input.limit,
    });
    return okAction({ items });
  } catch (error) {
    return failAction(error, "activity_action_error");
  }
}
