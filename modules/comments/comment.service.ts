import { z } from "zod";
import {
  checkTaskExists,
  findCommentAttachmentMeta,
  findCommentAttachments,
  findCommentById,
  findCommentMeta,
  findCommentsByTarget,
  insertComment,
  insertCommentAttachment,
  softDeleteComment,
  softDeleteCommentAttachment,
  updateCommentBody,
  validateFilesReady,
} from "@/modules/comments/comment.repository";
import { assertWorkspaceAccess } from "@/modules/workspaces/workspace.service";
import { notifyTaskWatchersAndAssignees } from "@/modules/tasks/task.service";
import { resolveObjectUrls } from "@/modules/files/file.service";
import { insertNotification } from "@/modules/notifications/notification.service";
import { createId } from "@/shared/utils/id";
import {
  authorizationError,
  notFoundError,
  validationError,
} from "@/shared/errors";
import { insertActivity } from "@/modules/workspaces/workspace.repository";
import type { CommentMention } from "@/lib/mention-helpers";

export type CommentAttachment = {
  id: string;
  fileId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  downloadUrl?: string | null;
};

export type CommentItem = {
  id: string;
  body: string;
  authorUserId: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
  attachments: CommentAttachment[];
  mentions: CommentMention[];
};

const mentionSchema = z.object({
  type: z.enum(["person", "page", "date"]),
  id: z.string().min(1).max(128),
  label: z.string().min(1).max(255),
});

const createCommentSchema = z.object({
  workspaceId: z.string().min(1),
  targetType: z.enum(["page", "task", "block"]),
  targetId: z.string().min(1),
  body: z.string().max(5000).optional().default(""),
  fileIds: z.array(z.string().min(1)).max(10).optional().default([]),
  mentions: z.array(mentionSchema).max(20).optional().default([]),
});

const updateCommentSchema = z.object({
  workspaceId: z.string().min(1),
  commentId: z.string().min(1),
  body: z.string().trim().min(1).max(5000),
  mentions: z.array(mentionSchema).max(20).optional(),
});

function parseMentionsJson(
  raw: string | CommentMention[] | null | undefined
): CommentMention[] {
  if (raw == null) return [];
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(value)) return [];
    return value.filter(
      (m): m is CommentMention =>
        m &&
        typeof m === "object" &&
        (m.type === "person" || m.type === "page" || m.type === "date") &&
        typeof m.id === "string" &&
        typeof m.label === "string"
    );
  } catch {
    return [];
  }
}

async function listAttachmentsForComments(
  commentIds: string[],
  workspaceId: string
): Promise<Map<string, CommentAttachment[]>> {
  const map = new Map<string, CommentAttachment[]>();
  if (commentIds.length === 0) return map;

  const rows = await findCommentAttachments(commentIds, workspaceId);
  const urlMap = await resolveObjectUrls(rows.map((r) => r.object_key));

  for (const r of rows) {
    const item: CommentAttachment = {
      id: r.id,
      fileId: r.file_id,
      filename: r.original_filename,
      contentType: r.content_type,
      sizeBytes: Number(r.size_bytes),
      downloadUrl: urlMap.get(r.object_key) ?? null,
    };
    const list = map.get(r.comment_id) ?? [];
    list.push(item);
    map.set(r.comment_id, list);
  }

  return map;
}

async function loadCommentById(
  commentId: string,
  workspaceId: string,
  _userId: string
): Promise<CommentItem> {
  const r = await findCommentById(commentId, workspaceId);
  if (!r) throw notFoundError("Comment not found");

  const attachments = await listAttachmentsForComments([r.id], workspaceId);
  return {
    id: r.id,
    body: r.body,
    authorUserId: r.author_user_id,
    authorName: r.author_name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    attachments: attachments.get(r.id) ?? [],
    mentions: parseMentionsJson(r.mentions_json),
  };
}

export async function listComments(
  workspaceId: string,
  userId: string,
  targetType: "page" | "task" | "block",
  targetId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: targetType === "task" ? "tasks.read" : "pages.read",
  });

  // Lightweight existence check
  if (targetType === "task") {
    const exists = await checkTaskExists(targetId, workspaceId);
    if (!exists) throw notFoundError("Task not found");
  }

  const rows = await findCommentsByTarget(
    workspaceId,
    targetType,
    targetId,
    200
  );

  const attachments = await listAttachmentsForComments(
    rows.map((r) => r.id),
    workspaceId
  );

  return rows.map(
    (r): CommentItem => ({
      id: r.id,
      body: r.body,
      authorUserId: r.author_user_id,
      authorName: r.author_name,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      attachments: attachments.get(r.id) ?? [],
      mentions: parseMentionsJson(r.mentions_json),
    })
  );
}

async function attachFilesToComment(input: {
  workspaceId: string;
  commentId: string;
  fileIds: string[];
  userId: string;
}) {
  if (input.fileIds.length === 0) return;

  const readyFiles = await validateFilesReady(input.fileIds, input.workspaceId);
  const ready = new Set(readyFiles);
  for (const fileId of input.fileIds) {
    if (!ready.has(fileId)) {
      throw validationError("Attachment is not ready");
    }
  }

  await Promise.all(
    input.fileIds.map((fileId) =>
      insertCommentAttachment({
        id: createId(),
        workspaceId: input.workspaceId,
        commentId: input.commentId,
        fileId,
        createdBy: input.userId,
      })
    )
  );
}

export async function createComment(userId: string, raw: unknown) {
  const parsed = createCommentSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid comment", parsed.error.flatten());
  }

  const body = (parsed.data.body ?? "").trim();
  const fileIds = parsed.data.fileIds ?? [];
  const mentions = parsed.data.mentions ?? [];
  if (!body && fileIds.length === 0) {
    throw validationError("Comment requires text or an attachment");
  }

  const permission =
    parsed.data.targetType === "task" ? "tasks.update" : "pages.update";

  await assertWorkspaceAccess({
    workspaceId: parsed.data.workspaceId,
    userId,
    permission,
  });

  if (parsed.data.targetType === "task") {
    const exists = await checkTaskExists(
      parsed.data.targetId,
      parsed.data.workspaceId
    );
    if (!exists) throw notFoundError("Task not found");
  }

  const id = createId();
  await insertComment({
    id,
    workspaceId: parsed.data.workspaceId,
    targetType: parsed.data.targetType,
    targetId: parsed.data.targetId,
    userId,
    body: body || " ",
    mentionsJson: mentions.length > 0 ? JSON.stringify(mentions) : null,
  });

  if (fileIds.length > 0) {
    await attachFilesToComment({
      workspaceId: parsed.data.workspaceId,
      commentId: id,
      fileIds,
      userId,
    });
  }

  // Side effects off the critical path
  void insertActivity({
    workspaceId: parsed.data.workspaceId,
    actorUserId: userId,
    action: "comment.created",
    resourceType: parsed.data.targetType,
    resourceId: parsed.data.targetId,
    metadata: { commentId: id, fileCount: fileIds.length },
  }).catch(() => undefined);

  if (parsed.data.targetType === "task") {
    void notifyTaskWatchersAndAssignees({
      workspaceId: parsed.data.workspaceId,
      taskId: parsed.data.targetId,
      actorUserId: userId,
      type: "task.commented",
      title: "New comment on a task",
      body: (body || "Attachment").slice(0, 180),
    }).catch(() => undefined);
  }

  const personMentions = mentions.filter(
    (m) => m.type === "person" && m.id !== userId
  );
  for (const mention of personMentions) {
    void insertNotification({
      workspaceId: parsed.data.workspaceId,
      userId: mention.id,
      type: "comment.mention",
      title: "You were mentioned in a comment",
      body: (body || `@${mention.label}`).slice(0, 180),
      resourceType: parsed.data.targetType,
      resourceId: parsed.data.targetId,
    }).catch(() => undefined);
  }

  return loadCommentById(id, parsed.data.workspaceId, userId);
}

export async function updateComment(userId: string, raw: unknown) {
  const parsed = updateCommentSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid comment update", parsed.error.flatten());
  }

  const comment = await findCommentMeta(
    parsed.data.commentId,
    parsed.data.workspaceId
  );
  if (!comment) throw notFoundError("Comment not found");

  await assertWorkspaceAccess({
    workspaceId: parsed.data.workspaceId,
    userId,
    permission:
      comment.target_type === "task" ? "tasks.update" : "pages.update",
  });

  if (comment.author_user_id !== userId) {
    throw authorizationError("You can only edit your own comments");
  }

  await updateCommentBody({
    body: parsed.data.body,
    commentId: parsed.data.commentId,
    workspaceId: parsed.data.workspaceId,
    mentionsJson:
      parsed.data.mentions !== undefined
        ? JSON.stringify(parsed.data.mentions)
        : null,
  });

  return loadCommentById(
    parsed.data.commentId,
    parsed.data.workspaceId,
    userId
  );
}

export async function deleteComment(
  userId: string,
  workspaceId: string,
  commentId: string
) {
  const comment = await findCommentMeta(commentId, workspaceId);
  if (!comment) throw notFoundError("Comment not found");

  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission:
      comment.target_type === "task" ? "tasks.update" : "pages.update",
  });

  if (comment.author_user_id !== userId) {
    throw authorizationError("You can only delete your own comments");
  }

  await softDeleteComment(commentId, workspaceId);

  void insertActivity({
    workspaceId,
    actorUserId: userId,
    action: "comment.deleted",
    resourceType: comment.target_type,
    resourceId: comment.target_id,
    metadata: { commentId },
  }).catch(() => undefined);
}

export async function detachCommentAttachment(
  userId: string,
  workspaceId: string,
  attachmentId: string
) {
  const row = await findCommentAttachmentMeta(attachmentId, workspaceId);
  if (!row) throw notFoundError("Attachment not found");

  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "tasks.update",
  });

  if (row.author_user_id !== userId && row.created_by !== userId) {
    throw authorizationError("You can only remove attachments from your comments");
  }

  await softDeleteCommentAttachment(attachmentId, workspaceId);
}
