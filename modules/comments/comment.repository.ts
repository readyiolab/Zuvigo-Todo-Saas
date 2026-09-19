import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/infrastructure/database/connection";
import type { CommentMention } from "@/lib/mention-helpers";

export type CommentAttachmentRow = RowDataPacket & {
  id: string;
  comment_id: string;
  file_id: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  object_key: string;
};

export type CommentRow = RowDataPacket & {
  id: string;
  body: string;
  author_user_id: string;
  author_name: string;
  created_at: Date;
  updated_at: Date;
  mentions_json: string | CommentMention[] | null;
};

export async function findCommentAttachments(
  commentIds: string[],
  workspaceId: string
): Promise<CommentAttachmentRow[]> {
  if (commentIds.length === 0) return [];

  const placeholders = commentIds.map((_, i) => `:c${i}`).join(", ");
  const params: Record<string, string> = { workspaceId };
  commentIds.forEach((id, i) => {
    params[`c${i}`] = id;
  });

  return query<CommentAttachmentRow[]>(
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
}

export async function findCommentById(
  commentId: string,
  workspaceId: string
): Promise<CommentRow | null> {
  const rows = await query<CommentRow[]>(
    `SELECT c.id, c.body, c.author_user_id, u.name AS author_name,
            c.created_at, c.updated_at, c.mentions_json
     FROM tbl_comments c
     INNER JOIN tbl_users u ON u.id = c.author_user_id
     WHERE c.id = :commentId
       AND c.workspace_id = :workspaceId
       AND c.deleted_at IS NULL
     LIMIT 1`,
    { commentId, workspaceId }
  );
  return rows[0] ?? null;
}

export async function checkTaskExists(
  targetId: string,
  workspaceId: string
): Promise<boolean> {
  type Exists = RowDataPacket & { ok: number };
  const exists = await query<Exists[]>(
    `SELECT 1 AS ok FROM tbl_tasks
     WHERE id = :targetId AND workspace_id = :workspaceId AND deleted_at IS NULL
     LIMIT 1`,
    { targetId, workspaceId }
  );
  return Boolean(exists[0]);
}

export async function findCommentsByTarget(
  workspaceId: string,
  targetType: "page" | "task" | "block",
  targetId: string,
  limit = 200
): Promise<CommentRow[]> {
  return query<CommentRow[]>(
    `SELECT c.id, c.body, c.author_user_id, u.name AS author_name,
            c.created_at, c.updated_at, c.mentions_json
     FROM tbl_comments c
     INNER JOIN tbl_users u ON u.id = c.author_user_id
     WHERE c.workspace_id = :workspaceId
       AND c.target_type = :targetType
       AND c.target_id = :targetId
       AND c.deleted_at IS NULL
     ORDER BY c.created_at ASC
     LIMIT ${Math.max(1, Math.min(limit, 500))}`,
    { workspaceId, targetType, targetId }
  );
}

export async function validateFilesReady(
  fileIds: string[],
  workspaceId: string
): Promise<string[]> {
  if (fileIds.length === 0) return [];
  type FileRow = RowDataPacket & { id: string; status: string };
  const placeholders = fileIds.map((_, i) => `:f${i}`).join(", ");
  const params: Record<string, string> = { workspaceId };
  fileIds.forEach((id, i) => {
    params[`f${i}`] = id;
  });

  const files = await query<FileRow[]>(
    `SELECT id, status FROM tbl_files
     WHERE workspace_id = :workspaceId
       AND id IN (${placeholders})
       AND deleted_at IS NULL`,
    params
  );
  return files.filter((f) => f.status === "ready").map((f) => f.id);
}

export async function insertCommentAttachment(record: {
  id: string;
  workspaceId: string;
  commentId: string;
  fileId: string;
  createdBy: string;
}): Promise<void> {
  await execute(
    `INSERT INTO tbl_comment_attachments
      (id, workspace_id, comment_id, file_id, created_by)
     VALUES (:id, :workspaceId, :commentId, :fileId, :createdBy)
     ON DUPLICATE KEY UPDATE deleted_at = NULL, updated_at = CURRENT_TIMESTAMP(3)`,
    record
  );
}

export async function insertComment(record: {
  id: string;
  workspaceId: string;
  targetType: "page" | "task" | "block";
  targetId: string;
  userId: string;
  body: string;
  mentionsJson: string | null;
}): Promise<void> {
  await execute(
    `INSERT INTO tbl_comments
      (id, workspace_id, target_type, target_id, author_user_id, body, mentions_json)
     VALUES (:id, :workspaceId, :targetType, :targetId, :userId, :body, :mentionsJson)`,
    record
  );
}

export type CommentMetaRow = RowDataPacket & {
  id: string;
  author_user_id: string;
  target_type: "page" | "task" | "block";
  target_id: string;
};

export async function findCommentMeta(
  commentId: string,
  workspaceId: string
): Promise<CommentMetaRow | null> {
  const rows = await query<CommentMetaRow[]>(
    `SELECT id, author_user_id, target_type, target_id FROM tbl_comments
     WHERE id = :commentId AND workspace_id = :workspaceId AND deleted_at IS NULL
     LIMIT 1`,
    { commentId, workspaceId }
  );
  return rows[0] ?? null;
}

export async function updateCommentBody(record: {
  commentId: string;
  workspaceId: string;
  body: string;
  mentionsJson: string | null;
}): Promise<void> {
  await execute(
    `UPDATE tbl_comments
     SET body = :body,
         mentions_json = COALESCE(:mentionsJson, mentions_json)
     WHERE id = :commentId AND workspace_id = :workspaceId`,
    record
  );
}

export async function softDeleteComment(
  commentId: string,
  workspaceId: string
): Promise<void> {
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
}

export type AttachmentMetaRow = RowDataPacket & {
  id: string;
  comment_id: string;
  created_by: string;
  author_user_id: string;
};

export async function findCommentAttachmentMeta(
  attachmentId: string,
  workspaceId: string
): Promise<AttachmentMetaRow | null> {
  const rows = await query<AttachmentMetaRow[]>(
    `SELECT a.id, a.comment_id, a.created_by, c.author_user_id
     FROM tbl_comment_attachments a
     INNER JOIN tbl_comments c ON c.id = a.comment_id
     WHERE a.id = :attachmentId
       AND a.workspace_id = :workspaceId
       AND a.deleted_at IS NULL
     LIMIT 1`,
    { attachmentId, workspaceId }
  );
  return rows[0] ?? null;
}

export async function softDeleteCommentAttachment(
  attachmentId: string,
  workspaceId: string
): Promise<void> {
  await execute(
    `UPDATE tbl_comment_attachments SET deleted_at = CURRENT_TIMESTAMP(3)
     WHERE id = :attachmentId AND workspace_id = :workspaceId`,
    { attachmentId, workspaceId }
  );
}
