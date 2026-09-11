import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/infrastructure/database/connection";
import { assertWorkspaceAccess } from "@/modules/workspaces/workspace.service";
import { notifyTaskWatchersAndAssignees } from "@/modules/tasks/task.service";
import { resolveObjectUrls } from "@/modules/files/file.service";
import { createId } from "@/shared/utils/id";
import {
  authorizationError,
  notFoundError,
  validationError,
} from "@/shared/errors";
import { insertActivity } from "@/modules/workspaces/workspace.repository";

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
};

const createCommentSchema = z.object({
  workspaceId: z.string().min(1),
  targetType: z.enum(["page", "task", "block"]),
  targetId: z.string().min(1),
  body: z.string().max(5000).optional().default(""),
  fileIds: z.array(z.string().min(1)).max(10).optional().default([]),
});

const updateCommentSchema = z.object({
  workspaceId: z.string().min(1),
  commentId: z.string().min(1),
  body: z.string().trim().min(1).max(5000),
});

async function listAttachmentsForComments(
  commentIds: string[],
  workspaceId: string
): Promise<Map<string, CommentAttachment[]>> {
  const map = new Map<string, CommentAttachment[]>();
  if (commentIds.length === 0) return map;

  type Row = RowDataPacket & {
    id: string;
    comment_id: string;
    file_id: string;
    original_filename: string;
    content_type: string;
    size_bytes: number;
    object_key: string;
  };

  const placeholders = commentIds.map((_, i) => `:c${i}`).join(", ");
  const params: Record<string, string> = { workspaceId };
  commentIds.forEach((id, i) => {
    params[`c${i}`] = id;
  });

  const rows = await query<Row[]>(
    `SELECT a.id, a.comment_id, a.file_id, f.original_filename, f.content_type,
            f.size_bytes, f.object_key
     FROM tbl_comment_attachments a
     INNER JOIN tbl_files f ON f.id = a.file_id
     WHERE a.workspace_id = :workspaceId
       AND a.comment_id IN (${placeholders})
       AND a.deleted_at IS NULL
       AND f.deleted_at IS NULL
       AND f.status = 'ready'
     ORDER BY a.created_at ASC`,
    params
  );

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
  userId: string
): Promise<CommentItem> {
  type Row = RowDataPacket & {
    id: string;
    body: string;
    author_user_id: string;
    author_name: string;
    created_at: Date;
    updated_at: Date;
  };

  const rows = await query<Row[]>(
    `SELECT c.id, c.body, c.author_user_id, u.name AS author_name,
            c.created_at, c.updated_at
     FROM tbl_comments c
     INNER JOIN tbl_users u ON u.id = c.author_user_id
     WHERE c.id = :commentId
       AND c.workspace_id = :workspaceId
       AND c.deleted_at IS NULL
     LIMIT 1`,
    { commentId, workspaceId }
  );
  const r = rows[0];
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

  // Lightweight existence check (avoid loading full task graph)
  if (targetType === "task") {
    type Exists = RowDataPacket & { ok: number };
    const exists = await query<Exists[]>(
      `SELECT 1 AS ok FROM tbl_tasks
       WHERE id = :targetId AND workspace_id = :workspaceId AND deleted_at IS NULL
       LIMIT 1`,
      { targetId, workspaceId }
    );
    if (!exists[0]) throw notFoundError("Task not found");
  }

  type Row = RowDataPacket & {
    id: string;
    body: string;
    author_user_id: string;
    author_name: string;
    created_at: Date;
    updated_at: Date;
  };

  const rows = await query<Row[]>(
    `SELECT c.id, c.body, c.author_user_id, u.name AS author_name,
            c.created_at, c.updated_at
     FROM tbl_comments c
     INNER JOIN tbl_users u ON u.id = c.author_user_id
     WHERE c.workspace_id = :workspaceId
       AND c.target_type = :targetType
       AND c.target_id = :targetId
       AND c.deleted_at IS NULL
     ORDER BY c.created_at ASC
     LIMIT 200`,
    { workspaceId, targetType, targetId }
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

  // Validate all files in one query
  type FileRow = RowDataPacket & { id: string; status: string };
  const placeholders = input.fileIds.map((_, i) => `:f${i}`).join(", ");
  const params: Record<string, string> = {
    workspaceId: input.workspaceId,
  };
  input.fileIds.forEach((id, i) => {
    params[`f${i}`] = id;
  });
  const files = await query<FileRow[]>(
    `SELECT id, status FROM tbl_files
     WHERE workspace_id = :workspaceId
       AND id IN (${placeholders})
       AND deleted_at IS NULL`,
    params
  );
  const ready = new Set(
    files.filter((f) => f.status === "ready").map((f) => f.id)
  );
  for (const fileId of input.fileIds) {
    if (!ready.has(fileId)) {
      throw validationError("Attachment is not ready");
    }
  }

  await Promise.all(
    input.fileIds.map(async (fileId) => {
      const id = createId();
      await execute(
        `INSERT INTO tbl_comment_attachments
          (id, workspace_id, comment_id, file_id, created_by)
         VALUES (:id, :workspaceId, :commentId, :fileId, :createdBy)
         ON DUPLICATE KEY UPDATE deleted_at = NULL, updated_at = CURRENT_TIMESTAMP(3)`,
        {
          id,
          workspaceId: input.workspaceId,
          commentId: input.commentId,
          fileId,
          createdBy: input.userId,
        }
      );
    })
  );
}

export async function createComment(userId: string, raw: unknown) {
  const parsed = createCommentSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid comment", parsed.error.flatten());
  }

  const body = (parsed.data.body ?? "").trim();
  const fileIds = parsed.data.fileIds ?? [];
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
    type Exists = RowDataPacket & { ok: number };
    const exists = await query<Exists[]>(
      `SELECT 1 AS ok FROM tbl_tasks
       WHERE id = :targetId AND workspace_id = :workspaceId AND deleted_at IS NULL
       LIMIT 1`,
      {
        targetId: parsed.data.targetId,
        workspaceId: parsed.data.workspaceId,
      }
    );
    if (!exists[0]) throw notFoundError("Task not found");
  }

  const id = createId();
  await execute(
    `INSERT INTO tbl_comments
      (id, workspace_id, target_type, target_id, author_user_id, body)
     VALUES (:id, :workspaceId, :targetType, :targetId, :userId, :body)`,
    {
      id,
      workspaceId: parsed.data.workspaceId,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      userId,
      body: body || " ",
    }
  );

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

  return loadCommentById(id, parsed.data.workspaceId, userId);
}

export async function updateComment(userId: string, raw: unknown) {
  const parsed = updateCommentSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid comment update", parsed.error.flatten());
  }

  type Row = RowDataPacket & {
    id: string;
    author_user_id: string;
    target_type: "page" | "task" | "block";
    target_id: string;
  };

  const rows = await query<Row[]>(
    `SELECT id, author_user_id, target_type, target_id FROM tbl_comments
     WHERE id = :commentId AND workspace_id = :workspaceId AND deleted_at IS NULL
     LIMIT 1`,
    { commentId: parsed.data.commentId, workspaceId: parsed.data.workspaceId }
  );
  const comment = rows[0];
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

  await execute(
    `UPDATE tbl_comments SET body = :body WHERE id = :commentId AND workspace_id = :workspaceId`,
    {
      body: parsed.data.body,
      commentId: parsed.data.commentId,
      workspaceId: parsed.data.workspaceId,
    }
  );

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
  type Row = RowDataPacket & {
    id: string;
    author_user_id: string;
    target_type: "page" | "task" | "block";
    target_id: string;
  };

  const rows = await query<Row[]>(
    `SELECT id, author_user_id, target_type, target_id FROM tbl_comments
     WHERE id = :commentId AND workspace_id = :workspaceId AND deleted_at IS NULL
     LIMIT 1`,
    { commentId, workspaceId }
  );
  const comment = rows[0];
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

  await execute(
    `UPDATE tbl_comments SET deleted_at = CURRENT_TIMESTAMP(3)
     WHERE id = :commentId AND workspace_id = :workspaceId`,
    { commentId, workspaceId }
  );

  await execute(
    `UPDATE tbl_comment_attachments SET deleted_at = CURRENT_TIMESTAMP(3)
     WHERE comment_id = :commentId AND workspace_id = :workspaceId AND deleted_at IS NULL`,
    { commentId, workspaceId }
  );

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
  type Row = RowDataPacket & {
    id: string;
    comment_id: string;
    created_by: string;
    author_user_id: string;
  };

  const rows = await query<Row[]>(
    `SELECT a.id, a.comment_id, a.created_by, c.author_user_id
     FROM tbl_comment_attachments a
     INNER JOIN tbl_comments c ON c.id = a.comment_id
     WHERE a.id = :attachmentId
       AND a.workspace_id = :workspaceId
       AND a.deleted_at IS NULL
     LIMIT 1`,
    { attachmentId, workspaceId }
  );
  const row = rows[0];
  if (!row) throw notFoundError("Attachment not found");

  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "tasks.update",
  });

  if (row.author_user_id !== userId && row.created_by !== userId) {
    throw authorizationError("You can only remove attachments from your comments");
  }

  await execute(
    `UPDATE tbl_comment_attachments SET deleted_at = CURRENT_TIMESTAMP(3)
     WHERE id = :attachmentId AND workspace_id = :workspaceId`,
    { attachmentId, workspaceId }
  );
}
