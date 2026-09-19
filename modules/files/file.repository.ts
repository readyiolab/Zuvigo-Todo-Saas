import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/infrastructure/database/connection";

export type FileRecordRow = RowDataPacket & {
  id: string;
  workspace_id: string;
  uploaded_by: string;
  storage_provider: string;
  bucket: string;
  object_key: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  status: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export async function insertPendingFile(record: {
  id: string;
  workspaceId: string;
  uploadedBy: string;
  bucket: string;
  objectKey: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}): Promise<void> {
  await execute(
    `INSERT INTO tbl_files
      (id, workspace_id, uploaded_by, storage_provider, bucket, object_key,
       original_filename, content_type, size_bytes, status)
     VALUES
      (:id, :workspaceId, :uploadedBy, 'do_spaces', :bucket, :objectKey,
       :filename, :contentType, :sizeBytes, 'pending')`,
    record
  );
}

export async function findFileByIdAndWorkspace(
  fileId: string,
  workspaceId: string
): Promise<FileRecordRow | null> {
  const rows = await query<FileRecordRow[]>(
    `SELECT id, workspace_id, uploaded_by, storage_provider, bucket, object_key,
            original_filename, content_type, size_bytes, status, created_at, updated_at, deleted_at
     FROM tbl_files
     WHERE id = :fileId AND workspace_id = :workspaceId AND deleted_at IS NULL
     LIMIT 1`,
    { fileId, workspaceId }
  );
  return rows[0] ?? null;
}

export async function updateFileStatus(
  fileId: string,
  workspaceId: string,
  status: "ready" | "failed" | "pending"
): Promise<void> {
  await execute(
    `UPDATE tbl_files SET status = :status WHERE id = :fileId AND workspace_id = :workspaceId`,
    { fileId, workspaceId, status }
  );
}

export async function markFileFailedAndDeleted(
  fileId: string,
  workspaceId: string
): Promise<void> {
  await execute(
    `UPDATE tbl_files
     SET status = 'failed', deleted_at = CURRENT_TIMESTAMP(3)
     WHERE id = :fileId AND workspace_id = :workspaceId`,
    { fileId, workspaceId }
  );
}

export async function markFileDeleted(fileId: string): Promise<void> {
  await execute(
    `UPDATE tbl_files
     SET status = 'deleted', deleted_at = CURRENT_TIMESTAMP(3)
     WHERE id = :fileId`,
    { fileId }
  );
}

export async function findOrphanPendingFiles(olderThanHours = 1): Promise<
  Array<{ id: string; workspace_id: string; object_key: string }>
> {
  type Row = RowDataPacket & {
    id: string;
    workspace_id: string;
    object_key: string;
  };
  return query<Row[]>(
    `SELECT id, workspace_id, object_key FROM tbl_files
     WHERE status IN ('pending', 'failed')
       AND deleted_at IS NULL
       AND created_at < DATE_SUB(NOW(), INTERVAL :hours HOUR)
     LIMIT 100`,
    { hours: olderThanHours }
  );
}
