"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/auth/auth.service";
import {
  type ActionResult,
  failAction,
  okAction,
} from "@/shared/actions/result";
import {
  createWorkspaceTag,
  deleteWorkspaceTag,
  listWorkspaceTags,
} from "@/modules/tags/tag.service";

export type { ActionResult };

export async function listTagsAction(input: {
  workspaceId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const tags = await listWorkspaceTags(input.workspaceId, user.id);
    return okAction({ tags });
  } catch (error) {
    return failAction(error, "tag_action_error");
  }
}

export async function createTagAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  name: string;
  color?: string | null;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const tag = await createWorkspaceTag(user.id, input);
    revalidatePath(`/w/${input.workspaceSlug}/tasks`);
    return okAction({ tag });
  } catch (error) {
    return failAction(error, "tag_action_error");
  }
}

export async function deleteTagAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  tagId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await deleteWorkspaceTag(input.workspaceId, input.tagId, user.id);
    revalidatePath(`/w/${input.workspaceSlug}/tasks`);
    return okAction();
  } catch (error) {
    return failAction(error, "tag_action_error");
  }
}
