import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/infrastructure/database/connection";
import { createId } from "@/shared/utils/id";
import type { PagePermissionLevel } from "@/lib/invite-permission";

export type PagePermissionRecord = {
  id: string;
  workspaceId: string;
  pageId: string;
  subjectType: "user" | "role";
  subjectId: string;
  permission: PagePermissionLevel;
};

type Row = RowDataPacket & {
  id: string;
  workspace_id: string;
  page_id: string;
  subject_type: "user" | "role";
  subject_id: string;
  permission: PagePermissionLevel;
};

function mapRow(row: Row): PagePermissionRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    pageId: row.page_id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    permission: row.permission,
  };
}

export async function upsertPagePermission(input: {
  workspaceId: string;
  pageId: string;
  subjectType: "user" | "role";
  subjectId: string;
  permission: PagePermissionLevel;
}) {
  const id = createId();
  await execute(
    `INSERT INTO tbl_page_permissions
      (id, workspace_id, page_id, subject_type, subject_id, permission)
     VALUES (:id, :workspaceId, :pageId, :subjectType, :subjectId, :permission)
     ON DUPLICATE KEY UPDATE
       permission = VALUES(permission),
       updated_at = CURRENT_TIMESTAMP(3)`,
    {
      id,
      workspaceId: input.workspaceId,
      pageId: input.pageId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      permission: input.permission,
    }
  );
}

export async function findUserPagePermission(
  pageId: string,
  userId: string
): Promise<PagePermissionRecord | null> {
  const rows = await query<Row[]>(
    `SELECT id, workspace_id, page_id, subject_type, subject_id, permission
     FROM tbl_page_permissions
     WHERE page_id = :pageId
       AND subject_type = 'user'
       AND subject_id = :userId
     LIMIT 1`,
    { pageId, userId }
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function listPageIdsForUser(
  workspaceId: string,
  userId: string
): Promise<string[]> {
  type IdRow = RowDataPacket & { page_id: string };
  const rows = await query<IdRow[]>(
    `SELECT page_id FROM tbl_page_permissions
     WHERE workspace_id = :workspaceId
       AND subject_type = 'user'
       AND subject_id = :userId`,
    { workspaceId, userId }
  );
  return rows.map((r) => r.page_id);
}

const PERMISSION_RANK: Record<PagePermissionLevel, number> = {
  view: 1,
  comment: 2,
  edit: 3,
  full: 4,
};

export function pagePermissionAtLeast(
  actual: PagePermissionLevel,
  required: PagePermissionLevel
) {
  return PERMISSION_RANK[actual] >= PERMISSION_RANK[required];
}
