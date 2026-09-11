import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import {
  buildObjectKey,
  createPresignedDownloadUrl,
  createPresignedUploadUrl,
  deleteObject,
  getSpacesBucket,
  objectExists,
} from "@/infrastructure/storage/spaces";
import { execute, query } from "@/infrastructure/database/connection";
import { getEnv, isSpacesConfigured } from "@/shared/env";
import {
  externalServiceError,
  notFoundError,
  validationError,
} from "@/shared/errors";
import { createId } from "@/shared/utils/id";
import { assertWorkspaceAccess } from "@/modules/workspaces/workspace.service";
import { enqueueJob } from "@/infrastructure/queue/client";
import { logger } from "@/shared/logger";

const MIME_BY_EXT: Record<string, string[]> = {
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
  gif: ["image/gif"],
  svg: ["image/svg+xml"],
  mp4: ["video/mp4"],
  webm: ["video/webm", "audio/webm"],
  mov: ["video/quicktime"],
  mp3: ["audio/mpeg"],
  m4a: ["audio/mp4"],
  wav: ["audio/wav"],
  pdf: ["application/pdf"],
  txt: ["text/plain"],
  doc: ["application/msword"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  xls: ["application/vnd.ms-excel"],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  zip: ["application/zip"],
};

const ALLOWED_MIME = new Set(Object.values(MIME_BY_EXT).flat());

export function getMaxUploadBytes() {
  return getEnv().MAX_UPLOAD_BYTES;
}

/** @deprecated use getMaxUploadBytes() — kept for callers */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function isAllowedUploadMime(contentType: string) {
  return ALLOWED_MIME.has(contentType);
}

export function extensionForFilename(filename: string): string | null {
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m?.[1] ?? null;
}

export function isMimeMatchingExtension(
  filename: string,
  contentType: string
): boolean {
  const ext = extensionForFilename(filename);
  if (!ext) return false;
  const allowed = MIME_BY_EXT[ext];
  if (!allowed) return false;
  return allowed.includes(contentType);
}

export function publicOrSignedUrl(objectKey: string, signedUrl: string) {
  const cdn = getEnv().DO_SPACES_CDN_ENDPOINT?.replace(/\/$/, "");
  if (cdn) return `${cdn}/${objectKey}`;
  return signedUrl;
}

/** Prefer CDN (no signing). Falls back to signed URL. */
export async function resolveObjectUrl(objectKey: string): Promise<string> {
  const cdn = getEnv().DO_SPACES_CDN_ENDPOINT?.replace(/\/$/, "");
  if (cdn) return `${cdn}/${objectKey}`;
  return createPresignedDownloadUrl({ objectKey });
}

/** Batch resolve URLs for many object keys (one CDN check, parallel signs). */
export async function resolveObjectUrls(
  objectKeys: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const cdn = getEnv().DO_SPACES_CDN_ENDPOINT?.replace(/\/$/, "");
  if (cdn) {
    for (const key of objectKeys) map.set(key, `${cdn}/${key}`);
    return map;
  }
  await Promise.all(
    objectKeys.map(async (key) => {
      try {
        map.set(key, await createPresignedDownloadUrl({ objectKey: key }));
      } catch {
        /* skip */
      }
    })
  );
  return map;
}

function buildPresignSchema() {
  return z.object({
    workspaceId: z.string().min(1),
    filename: z.string().trim().min(1).max(255),
    contentType: z.string().trim().min(1).max(128),
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(getMaxUploadBytes()),
  });
}

export const presignUploadSchema = z.object({
  workspaceId: z.string().min(1),
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(128),
  sizeBytes: z.number().int().positive(),
});

export async function createUploadUrl(userId: string, raw: unknown) {
  if (!isSpacesConfigured()) {
    throw externalServiceError("File storage is not configured");
  }

  const parsed = buildPresignSchema().safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid upload request", parsed.error.flatten());
  }

  if (!isAllowedUploadMime(parsed.data.contentType)) {
    throw validationError("File type is not allowed");
  }

  if (
    !isMimeMatchingExtension(parsed.data.filename, parsed.data.contentType)
  ) {
    throw validationError("File extension does not match content type");
  }

  if (parsed.data.sizeBytes > getMaxUploadBytes()) {
    throw validationError(
      `File exceeds maximum size of ${Math.round(getMaxUploadBytes() / (1024 * 1024))}MB`
    );
  }

  await assertWorkspaceAccess({
    workspaceId: parsed.data.workspaceId,
    userId,
    permission: "files.upload",
  });

  const fileId = createId();
  const objectKey = buildObjectKey({
    workspaceId: parsed.data.workspaceId,
    fileId,
    filename: parsed.data.filename,
  });
  const bucket = getSpacesBucket();

  await execute(
    `INSERT INTO tbl_files
      (id, workspace_id, uploaded_by, storage_provider, bucket, object_key,
       original_filename, content_type, size_bytes, status)
     VALUES
      (:id, :workspaceId, :uploadedBy, 'do_spaces', :bucket, :objectKey,
       :filename, :contentType, :sizeBytes, 'pending')`,
    {
      id: fileId,
      workspaceId: parsed.data.workspaceId,
      uploadedBy: userId,
      bucket,
      objectKey,
      filename: parsed.data.filename,
      contentType: parsed.data.contentType,
      sizeBytes: parsed.data.sizeBytes,
    }
  );

  const uploadUrl = await createPresignedUploadUrl({
    objectKey,
    contentType: parsed.data.contentType,
  });

  // Schedule cleanup if never confirmed
  void enqueueJob(
    "file-cleanup",
    { fileId, workspaceId: parsed.data.workspaceId },
    { delay: 60 * 60 * 1000 }
  );

  return { fileId, uploadUrl, objectKey, maxBytes: getMaxUploadBytes() };
}

export async function markFileFailed(
  fileId: string,
  workspaceId: string,
  userId?: string
): Promise<void> {
  if (userId) {
    await assertWorkspaceAccess({
      workspaceId,
      userId,
      permission: "files.upload",
    });
  }
  type FileRow = RowDataPacket & {
    object_key: string;
    status: string;
  };
  const rows = await query<FileRow[]>(
    `SELECT object_key, status FROM tbl_files
     WHERE id = :fileId AND workspace_id = :workspaceId AND deleted_at IS NULL
     LIMIT 1`,
    { fileId, workspaceId }
  );
  const file = rows[0];
  if (!file) return;

  await execute(
    `UPDATE tbl_files
     SET status = 'failed', deleted_at = CURRENT_TIMESTAMP(3)
     WHERE id = :fileId AND workspace_id = :workspaceId`,
    { fileId, workspaceId }
  );

  try {
    await deleteObject(file.object_key);
  } catch (error) {
    logger.warn("spaces_delete_failed", {
      fileId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function confirmUpload(
  userId: string,
  fileId: string,
  workspaceId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "files.upload",
  });

  type FileRow = RowDataPacket & {
    id: string;
    workspace_id: string;
    status: string;
    object_key: string;
  };

  const rows = await query<FileRow[]>(
    `SELECT id, workspace_id, status, object_key FROM tbl_files
     WHERE id = :fileId AND workspace_id = :workspaceId AND deleted_at IS NULL
     LIMIT 1`,
    { fileId, workspaceId }
  );
  const file = rows[0];
  if (!file) throw notFoundError("File not found");

  const exists = await objectExists(file.object_key);
  if (!exists) {
    await markFileFailed(fileId, workspaceId);
    throw validationError("Uploaded file was not found in storage");
  }

  await execute(
    `UPDATE tbl_files SET status = 'ready' WHERE id = :fileId AND workspace_id = :workspaceId`,
    { fileId, workspaceId }
  );

  return { fileId, status: "ready" as const };
}

export async function getDownloadUrl(
  userId: string,
  fileId: string,
  workspaceId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "workspace.read",
  });

  type FileRow = RowDataPacket & {
    id: string;
    object_key: string;
    status: string;
  };

  const rows = await query<FileRow[]>(
    `SELECT id, object_key, status FROM tbl_files
     WHERE id = :fileId AND workspace_id = :workspaceId AND deleted_at IS NULL
     LIMIT 1`,
    { fileId, workspaceId }
  );
  const file = rows[0];
  if (!file || file.status !== "ready") throw notFoundError("File not found");

  const signed = await createPresignedDownloadUrl({
    objectKey: file.object_key,
  });
  const downloadUrl = publicOrSignedUrl(file.object_key, signed);
  return { fileId, downloadUrl };
}

/** Fast path: resolve URL from known object key without re-checking membership. */
export async function getDownloadUrlForObjectKey(objectKey: string) {
  return resolveObjectUrl(objectKey);
}

export async function cleanupStaleFile(fileId: string, workspaceId: string) {
  type FileRow = RowDataPacket & {
    id: string;
    object_key: string;
    status: string;
  };
  const rows = await query<FileRow[]>(
    `SELECT id, object_key, status FROM tbl_files
     WHERE id = :fileId AND workspace_id = :workspaceId AND deleted_at IS NULL
     LIMIT 1`,
    { fileId, workspaceId }
  );
  const file = rows[0];
  if (!file) return;
  if (file.status === "ready") return;

  await execute(
    `UPDATE tbl_files
     SET status = 'deleted', deleted_at = CURRENT_TIMESTAMP(3)
     WHERE id = :fileId`,
    { fileId }
  );
  try {
    await deleteObject(file.object_key);
  } catch (error) {
    logger.warn("spaces_cleanup_delete_failed", {
      fileId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function cleanupOrphanPendingFiles(olderThanHours = 1) {
  type FileRow = RowDataPacket & {
    id: string;
    workspace_id: string;
    object_key: string;
  };
  const rows = await query<FileRow[]>(
    `SELECT id, workspace_id, object_key FROM tbl_files
     WHERE status IN ('pending', 'failed')
       AND deleted_at IS NULL
       AND created_at < DATE_SUB(NOW(), INTERVAL :hours HOUR)
     LIMIT 100`,
    { hours: olderThanHours }
  );
  for (const row of rows) {
    await cleanupStaleFile(row.id, row.workspace_id);
  }
  return rows.length;
}

export async function assertReadyFileInWorkspace(
  fileId: string,
  workspaceId: string
) {
  type FileRow = RowDataPacket & { id: string; status: string };
  const rows = await query<FileRow[]>(
    `SELECT id, status FROM tbl_files
     WHERE id = :fileId AND workspace_id = :workspaceId AND deleted_at IS NULL
     LIMIT 1`,
    { fileId, workspaceId }
  );
  const file = rows[0];
  if (!file || file.status !== "ready") {
    throw validationError("Attachment is not ready");
  }
  return file;
}
