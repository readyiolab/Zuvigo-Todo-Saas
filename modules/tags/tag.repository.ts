import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/infrastructure/database/connection";

export type TagRow = RowDataPacket & {
  id: string;
  workspace_id: string;
  name: string;
  color: string | null;
};

export async function findTagsByWorkspaceId(workspaceId: string): Promise<TagRow[]> {
  return query<TagRow[]>(
    `SELECT id, workspace_id, name, color FROM tbl_tags
     WHERE workspace_id = :workspaceId
     ORDER BY name ASC`,
    { workspaceId }
  );
}

export async function insertTag(record: {
  id: string;
  workspaceId: string;
  name: string;
  color: string | null;
}): Promise<void> {
  await execute(
    `INSERT INTO tbl_tags (id, workspace_id, name, color)
     VALUES (:id, :workspaceId, :name, :color)`,
    {
      id: record.id,
      workspaceId: record.workspaceId,
      name: record.name,
      color: record.color,
    }
  );
}

export async function deleteTagById(
  workspaceId: string,
  tagId: string
): Promise<void> {
  await execute(`DELETE FROM tbl_task_tags WHERE tag_id = :tagId`, { tagId });
  await execute(
    `DELETE FROM tbl_tags WHERE id = :tagId AND workspace_id = :workspaceId`,
    { tagId, workspaceId }
  );
}
