import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/infrastructure/database/connection";
import { assertWorkspaceAccess } from "@/modules/workspaces/workspace.service";
import { createId } from "@/shared/utils/id";
import { conflictError, validationError } from "@/shared/errors";

export type TagRecord = {
  id: string;
  workspaceId: string;
  name: string;
  color: string | null;
};

const createTagSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().trim().min(1).max(64),
  color: z.string().trim().max(32).nullable().optional(),
});

export async function listWorkspaceTags(workspaceId: string, userId: string) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "tasks.read",
  });
  type Row = RowDataPacket & {
    id: string;
    workspace_id: string;
    name: string;
    color: string | null;
  };
  const rows = await query<Row[]>(
    `SELECT id, workspace_id, name, color FROM tbl_tags
     WHERE workspace_id = :workspaceId
     ORDER BY name ASC`,
    { workspaceId }
  );
  return rows.map(
    (r): TagRecord => ({
      id: r.id,
      workspaceId: r.workspace_id,
      name: r.name,
      color: r.color,
    })
  );
}

export async function createWorkspaceTag(userId: string, raw: unknown) {
  const parsed = createTagSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid tag", parsed.error.flatten());
  }
  await assertWorkspaceAccess({
    workspaceId: parsed.data.workspaceId,
    userId,
    permission: "tasks.update",
  });
  const id = createId();
  try {
    await execute(
      `INSERT INTO tbl_tags (id, workspace_id, name, color)
       VALUES (:id, :workspaceId, :name, :color)`,
      {
        id,
        workspaceId: parsed.data.workspaceId,
        name: parsed.data.name,
        color: parsed.data.color ?? null,
      }
    );
  } catch {
    throw conflictError("A tag with this name already exists");
  }
  return {
    id,
    workspaceId: parsed.data.workspaceId,
    name: parsed.data.name,
    color: parsed.data.color ?? null,
  } satisfies TagRecord;
}

export async function deleteWorkspaceTag(
  workspaceId: string,
  tagId: string,
  userId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "tasks.update",
  });
  await execute(`DELETE FROM tbl_task_tags WHERE tag_id = :tagId`, { tagId });
  await execute(
    `DELETE FROM tbl_tags WHERE id = :tagId AND workspace_id = :workspaceId`,
    { tagId, workspaceId }
  );
}
