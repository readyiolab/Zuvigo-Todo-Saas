"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/auth/auth.service";
import {
  type ActionResult,
  failAction,
  okAction,
} from "@/shared/actions/result";
import {
  createComment,
  deleteComment,
  detachCommentAttachment,
  listComments,
  updateComment,
} from "@/modules/comments/comment.service";

export type { ActionResult };

function revalidateCommentTarget(
  workspaceSlug: string,
  targetType: string,
  targetId: string
) {
  // Avoid revalidating the heavy tasks list on every comment — client updates locally.
  if (targetType === "task") {
    revalidatePath(`/w/${workspaceSlug}/tasks/${targetId}`);
  }
}

export async function listCommentsAction(input: {
  workspaceId: string;
  targetType: "page" | "task" | "block";
  targetId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const comments = await listComments(
      input.workspaceId,
      user.id,
      input.targetType,
      input.targetId
    );
    return okAction({ comments });
  } catch (error) {
    return failAction(error, "comment_action_error");
  }
}

export async function createCommentAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  targetType: "page" | "task" | "block";
  targetId: string;
  body: string;
  fileIds?: string[];
  mentions?: Array<{ type: "person" | "page" | "date"; id: string; label: string }>;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const comment = await createComment(user.id, {
      workspaceId: input.workspaceId,
      targetType: input.targetType,
      targetId: input.targetId,
      body: input.body,
      fileIds: input.fileIds ?? [],
      mentions: input.mentions ?? [],
    });
    revalidateCommentTarget(
      input.workspaceSlug,
      input.targetType,
      input.targetId
    );
    return okAction({ comment });
  } catch (error) {
    return failAction(error, "comment_action_error");
  }
}

export async function updateCommentAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  commentId: string;
  body: string;
  targetType: "page" | "task" | "block";
  targetId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const comment = await updateComment(user.id, {
      workspaceId: input.workspaceId,
      commentId: input.commentId,
      body: input.body,
    });
    revalidateCommentTarget(
      input.workspaceSlug,
      input.targetType,
      input.targetId
    );
    return okAction({ comment });
  } catch (error) {
    return failAction(error, "comment_action_error");
  }
}

export async function deleteCommentAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  commentId: string;
  targetType: "page" | "task" | "block";
  targetId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await deleteComment(user.id, input.workspaceId, input.commentId);
    revalidateCommentTarget(
      input.workspaceSlug,
      input.targetType,
      input.targetId
    );
    return okAction();
  } catch (error) {
    return failAction(error, "comment_action_error");
  }
}

export async function detachCommentAttachmentAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  attachmentId: string;
  targetType: "page" | "task" | "block";
  targetId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await detachCommentAttachment(
      user.id,
      input.workspaceId,
      input.attachmentId
    );
    revalidateCommentTarget(
      input.workspaceSlug,
      input.targetType,
      input.targetId
    );
    return okAction();
  } catch (error) {
    return failAction(error, "comment_action_error");
  }
}
