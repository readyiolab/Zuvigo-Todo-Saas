import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/infrastructure/database/connection";
import { createId } from "@/shared/utils/id";
import { sortOrderBetween } from "@/modules/editor/editor.types";
import type {
  ProjectRecord,
  ProjectStatus,
} from "@/modules/projects/project.types";

type ProjectRow = RowDataPacket & {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | Date | null;
  due_date: string | Date | null;
  created_by: string;
  sort_order: string;
  updated_at: Date;
};

function formatDate(value: string | Date | null): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function mapProject(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    status: row.status,
    startDate: formatDate(row.start_date),
    dueDate: formatDate(row.due_date),
    createdBy: row.created_by,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
  };
}

export function nextSortAfter(last: string | null) {
  return sortOrderBetween(last, null);
}

export async function listProjectsByWorkspace(workspaceId: string) {
  const rows = await query<ProjectRow[]>(
    `SELECT * FROM tbl_projects
     WHERE workspace_id = :workspaceId
       AND deleted_at IS NULL
     ORDER BY sort_order ASC, created_at ASC`,
    { workspaceId }
  );
  return rows.map(mapProject);
}

export async function findProjectById(projectId: string, workspaceId: string) {
  const rows = await query<ProjectRow[]>(
    `SELECT * FROM tbl_projects
     WHERE id = :projectId
       AND workspace_id = :workspaceId
       AND deleted_at IS NULL
     LIMIT 1`,
    { projectId, workspaceId }
  );
  return rows[0] ? mapProject(rows[0]) : null;
}

export async function getMaxProjectSortOrder(workspaceId: string) {
  type Row = RowDataPacket & { sort_order: string | null };
  const rows = await query<Row[]>(
    `SELECT sort_order FROM tbl_projects
     WHERE workspace_id = :workspaceId AND deleted_at IS NULL
     ORDER BY sort_order DESC
     LIMIT 1`,
    { workspaceId }
  );
  return rows[0]?.sort_order ?? null;
}

export async function createProjectRecord(input: {
  workspaceId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  dueDate: string | null;
  createdBy: string;
  sortOrder: string;
}) {
  const id = createId();
  await execute(
    `INSERT INTO tbl_projects
      (id, workspace_id, name, description, status, start_date, due_date, created_by, sort_order)
     VALUES
      (:id, :workspaceId, :name, :description, :status, :startDate, :dueDate, :createdBy, :sortOrder)`,
    {
      id,
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description,
      status: input.status,
      startDate: input.startDate,
      dueDate: input.dueDate,
      createdBy: input.createdBy,
      sortOrder: input.sortOrder,
    }
  );

  await execute(
    `INSERT INTO tbl_activity_logs
      (id, workspace_id, actor_user_id, action, resource_type, resource_id, metadata)
     VALUES (:id, :workspaceId, :actorUserId, 'project.created', 'project', :resourceId, :metadata)`,
    {
      id: createId(),
      workspaceId: input.workspaceId,
      actorUserId: input.createdBy,
      resourceId: id,
      metadata: JSON.stringify({ name: input.name }),
    }
  );

  return id;
}

export async function updateProjectRecord(
  projectId: string,
  workspaceId: string,
  data: {
    name?: string;
    description?: string | null;
    status?: ProjectStatus;
    startDate?: string | null;
    dueDate?: string | null;
  }
) {
  const sets: string[] = [];
  const params: Record<string, unknown> = { projectId, workspaceId };

  if (data.name !== undefined) {
    sets.push("name = :name");
    params.name = data.name;
  }
  if (data.description !== undefined) {
    sets.push("description = :description");
    params.description = data.description;
  }
  if (data.status !== undefined) {
    sets.push("status = :status");
    params.status = data.status;
  }
  if (data.startDate !== undefined) {
    sets.push("start_date = :startDate");
    params.startDate = data.startDate;
  }
  if (data.dueDate !== undefined) {
    sets.push("due_date = :dueDate");
    params.dueDate = data.dueDate;
  }

  if (sets.length === 0) return;

  await execute(
    `UPDATE tbl_projects SET ${sets.join(", ")}
     WHERE id = :projectId AND workspace_id = :workspaceId AND deleted_at IS NULL`,
    params
  );
}

export async function softDeleteProject(projectId: string, workspaceId: string) {
  await execute(
    `UPDATE tbl_projects
     SET deleted_at = CURRENT_TIMESTAMP(3), status = 'archived'
     WHERE id = :projectId AND workspace_id = :workspaceId AND deleted_at IS NULL`,
    { projectId, workspaceId }
  );
}
