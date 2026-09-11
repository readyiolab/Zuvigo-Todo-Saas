import type { RowDataPacket } from "mysql2";
import {
  execute,
  query,
  withTransaction,
} from "@/infrastructure/database/connection";
import { createId } from "@/shared/utils/id";
import { sortOrderBetween } from "@/modules/editor/editor.types";
import type {
  TaskAssignee,
  TaskDueFilter,
  TaskPriority,
  TaskRecord,
  TaskRecurrence,
  TaskSort,
  TaskStatus,
  TaskTag,
  TaskWatcher,
} from "@/modules/tasks/task.types";

type TaskRow = RowDataPacket & {
  id: string;
  workspace_id: string;
  project_id: string | null;
  parent_task_id: string | null;
  project_name: string | null;
  title: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  start_at: Date | null;
  due_at: Date | null;
  follow_up_at: Date | null;
  remind_at: Date | null;
  recurrence_rule: TaskRecurrence | null;
  sort_order: string;
  created_by: string;
  created_at: Date | null;
  completed_at: Date | null;
  estimated_duration_minutes: number | null;
  actual_duration_minutes: number | null;
  focus_started_at: Date | null;
  updated_at: Date;
};

export function nextSortAfter(last: string | null) {
  return sortOrderBetween(last, null);
}

function mapTask(
  row: TaskRow,
  assignees: TaskAssignee[] = [],
  tags: TaskTag[] = [],
  watchers: TaskWatcher[] = []
): TaskRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    projectName: row.project_name,
    parentTaskId: row.parent_task_id,
    title: row.title,
    description: row.description,
    icon: row.icon,
    color: row.color,
    status: row.status,
    priority: row.priority,
    startAt: row.start_at,
    dueAt: row.due_at,
    followUpAt: row.follow_up_at,
    remindAt: row.remind_at,
    recurrenceRule: row.recurrence_rule,
    sortOrder: row.sort_order,
    createdBy: row.created_by,
    createdAt: row.created_at ?? null,
    completedAt: row.completed_at,
    estimatedDurationMinutes: row.estimated_duration_minutes ?? null,
    actualDurationMinutes: row.actual_duration_minutes ?? null,
    focusStartedAt: row.focus_started_at ?? null,
    updatedAt: row.updated_at,
    assignees,
    tags,
    watchers,
  };
}

function normalizeDate(value: string | Date | null | undefined) {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  // MySQL DATETIME rejects ISO strings with T/Z; pass a Date for mysql2.
  return date;
}

export async function listAssigneesForTasks(taskIds: string[]) {
  if (taskIds.length === 0) return new Map<string, TaskAssignee[]>();

  type Row = RowDataPacket & {
    task_id: string;
    user_id: string;
    name: string;
    email: string;
    deleted_at: Date | null;
  };

  const placeholders = taskIds.map((_, i) => `:id${i}`).join(", ");
  const params: Record<string, string> = {};
  taskIds.forEach((id, i) => {
    params[`id${i}`] = id;
  });

  const rows = await query<Row[]>(
    `SELECT a.task_id, a.user_id, u.name, u.email, u.deleted_at
     FROM tbl_task_assignees a
     INNER JOIN tbl_users u ON u.id = a.user_id
     WHERE a.task_id IN (${placeholders})
     ORDER BY u.name ASC`,
    params
  );

  const map = new Map<string, TaskAssignee[]>();
  for (const row of rows) {
    const list = map.get(row.task_id) ?? [];
    list.push({
      userId: row.user_id,
      name: row.deleted_at ? "Former member" : row.name,
      email: row.deleted_at ? "" : row.email,
    });
    map.set(row.task_id, list);
  }
  return map;
}

export async function listTagsForTasks(taskIds: string[]) {
  if (taskIds.length === 0) return new Map<string, TaskTag[]>();
  type Row = RowDataPacket & {
    task_id: string;
    id: string;
    name: string;
    color: string | null;
  };
  const placeholders = taskIds.map((_, i) => `:id${i}`).join(", ");
  const params: Record<string, string> = {};
  taskIds.forEach((id, i) => {
    params[`id${i}`] = id;
  });
  const rows = await query<Row[]>(
    `SELECT tt.task_id, t.id, t.name, t.color
     FROM tbl_task_tags tt
     INNER JOIN tbl_tags t ON t.id = tt.tag_id
     WHERE tt.task_id IN (${placeholders})
     ORDER BY t.name ASC`,
    params
  );
  const map = new Map<string, TaskTag[]>();
  for (const row of rows) {
    const list = map.get(row.task_id) ?? [];
    list.push({ id: row.id, name: row.name, color: row.color });
    map.set(row.task_id, list);
  }
  return map;
}

export async function listWatchersForTasks(taskIds: string[]) {
  if (taskIds.length === 0) return new Map<string, TaskWatcher[]>();
  type Row = RowDataPacket & {
    task_id: string;
    user_id: string;
    name: string;
    email: string;
  };
  const placeholders = taskIds.map((_, i) => `:id${i}`).join(", ");
  const params: Record<string, string> = {};
  taskIds.forEach((id, i) => {
    params[`id${i}`] = id;
  });
  const rows = await query<Row[]>(
    `SELECT w.task_id, w.user_id, u.name, u.email
     FROM tbl_task_watchers w
     INNER JOIN tbl_users u ON u.id = w.user_id AND u.deleted_at IS NULL
     WHERE w.task_id IN (${placeholders})
     ORDER BY u.name ASC`,
    params
  );
  const map = new Map<string, TaskWatcher[]>();
  for (const row of rows) {
    const list = map.get(row.task_id) ?? [];
    list.push({
      userId: row.user_id,
      name: row.name,
      email: row.email,
    });
    map.set(row.task_id, list);
  }
  return map;
}

async function hydrateTasks(rows: TaskRow[]) {
  const ids = rows.map((r) => r.id);
  const [assignees, tags, watchers] = await Promise.all([
    listAssigneesForTasks(ids),
    listTagsForTasks(ids),
    listWatchersForTasks(ids),
  ]);
  return rows.map((row) =>
    mapTask(
      row,
      assignees.get(row.id) ?? [],
      tags.get(row.id) ?? [],
      watchers.get(row.id) ?? []
    )
  );
}

export async function listTasksByWorkspace(
  workspaceId: string,
  filters?: {
    projectId?: string | null;
    status?: TaskStatus;
    assigneeId?: string;
    createdBy?: string;
    tagId?: string;
    parentTaskId?: string | null;
    priority?: TaskPriority;
    q?: string;
    due?: TaskDueFilter;
    sort?: TaskSort;
  }
) {
  const clauses = ["t.workspace_id = :workspaceId", "t.deleted_at IS NULL"];
  const params: Record<string, unknown> = { workspaceId };

  if (filters?.projectId) {
    clauses.push("t.project_id = :projectId");
    params.projectId = filters.projectId;
  } else if (filters?.projectId === null) {
    clauses.push("t.project_id IS NULL");
  }

  if (filters?.parentTaskId) {
    clauses.push("t.parent_task_id = :parentTaskId");
    params.parentTaskId = filters.parentTaskId;
  } else if (filters?.parentTaskId === null) {
    clauses.push("t.parent_task_id IS NULL");
  }

  if (filters?.status) {
    clauses.push("t.status = :status");
    params.status = filters.status;
  }

  if (filters?.priority) {
    clauses.push("t.priority = :priority");
    params.priority = filters.priority;
  }

  if (filters?.createdBy) {
    clauses.push("t.created_by = :createdBy");
    params.createdBy = filters.createdBy;
  }

  if (filters?.q?.trim()) {
    clauses.push("t.title LIKE :q");
    params.q = `%${filters.q.trim()}%`;
  }

  if (filters?.assigneeId) {
    clauses.push(
      `EXISTS (
        SELECT 1 FROM tbl_task_assignees a
        WHERE a.task_id = t.id AND a.user_id = :assigneeId
      )`
    );
    params.assigneeId = filters.assigneeId;
  }

  if (filters?.tagId) {
    clauses.push(
      `EXISTS (
        SELECT 1 FROM tbl_task_tags tt
        WHERE tt.task_id = t.id AND tt.tag_id = :tagId
      )`
    );
    params.tagId = filters.tagId;
  }

  if (filters?.due === "today") {
    clauses.push("t.due_at IS NOT NULL");
    clauses.push("DATE(t.due_at) = CURDATE()");
    clauses.push("t.status NOT IN ('completed', 'cancelled')");
  } else if (filters?.due === "upcoming") {
    clauses.push("t.due_at IS NOT NULL");
    clauses.push("DATE(t.due_at) > CURDATE()");
    clauses.push("t.status NOT IN ('completed', 'cancelled')");
  } else if (filters?.due === "overdue") {
    clauses.push("t.due_at IS NOT NULL");
    clauses.push("DATE(t.due_at) < CURDATE()");
    clauses.push("t.status NOT IN ('completed', 'cancelled')");
  } else if (filters?.due === "follow_up") {
    clauses.push("t.follow_up_at IS NOT NULL");
    clauses.push("t.status NOT IN ('completed', 'cancelled')");
  } else if (filters?.due === "completed") {
    clauses.push("t.status = 'completed'");
  } else if (filters?.due === "cancelled") {
    clauses.push("t.status = 'cancelled'");
  }

  const orderBy =
    filters?.sort === "priority"
      ? `FIELD(t.priority, 'urgent', 'high', 'medium', 'low') ASC, t.due_at IS NULL ASC, t.due_at ASC`
      : filters?.sort === "due"
        ? `t.due_at IS NULL ASC, t.due_at ASC, t.sort_order ASC`
        : filters?.sort === "title"
          ? `t.title ASC`
          : filters?.sort === "created"
            ? `t.created_at DESC`
            : `t.status ASC, t.sort_order ASC, t.created_at ASC`;

  const rows = await query<TaskRow[]>(
    `SELECT t.*, p.name AS project_name
     FROM tbl_tasks t
     LEFT JOIN tbl_projects p
       ON p.id = t.project_id AND p.deleted_at IS NULL
     WHERE ${clauses.join(" AND ")}
     ORDER BY ${orderBy}
     LIMIT 500`,
    params
  );

  return hydrateTasks(rows);
}

export async function findTaskById(taskId: string, workspaceId: string) {
  const rows = await query<TaskRow[]>(
    `SELECT t.*, p.name AS project_name
     FROM tbl_tasks t
     LEFT JOIN tbl_projects p
       ON p.id = t.project_id AND p.deleted_at IS NULL
     WHERE t.id = :taskId
       AND t.workspace_id = :workspaceId
       AND t.deleted_at IS NULL
     LIMIT 1`,
    { taskId, workspaceId }
  );
  if (!rows[0]) return null;
  const [task] = await hydrateTasks(rows);
  return task ?? null;
}

export async function getMaxTaskSortOrder(
  workspaceId: string,
  status: TaskStatus,
  projectId?: string | null
) {
  type Row = RowDataPacket & { sort_order: string | null };
  const projectClause =
    projectId === undefined
      ? ""
      : projectId === null
        ? "AND project_id IS NULL"
        : "AND project_id = :projectId";

  const rows = await query<Row[]>(
    `SELECT sort_order FROM tbl_tasks
     WHERE workspace_id = :workspaceId
       AND deleted_at IS NULL
       AND status = :status
       ${projectClause}
     ORDER BY sort_order DESC
     LIMIT 1`,
    projectId === undefined || projectId === null
      ? { workspaceId, status }
      : { workspaceId, status, projectId }
  );
  return rows[0]?.sort_order ?? null;
}

export async function createTaskRecord(input: {
  workspaceId: string;
  projectId: string | null;
  parentTaskId?: string | null;
  title: string;
  description: string | null;
  icon?: string | null;
  color?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startAt?: string | null;
  dueAt: string | null;
  followUpAt?: string | null;
  remindAt?: string | null;
  recurrenceRule?: TaskRecurrence | null;
  estimatedDurationMinutes?: number | null;
  createdBy: string;
  sortOrder: string;
  assigneeIds: string[];
  tagIds?: string[];
}) {
  const id = createId();
  const completedAt = input.status === "completed" ? new Date() : null;
  const assigneeIds = [...new Set(input.assigneeIds)];
  const tagIds = [...new Set(input.tagIds ?? [])];

  await withTransaction(async (conn) => {
    await conn.execute(
      `INSERT INTO tbl_tasks
        (id, workspace_id, project_id, parent_task_id, title, description, icon, color,
         status, priority, start_at, due_at, follow_up_at, remind_at, recurrence_rule,
         sort_order, created_by, completed_at, estimated_duration_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.workspaceId,
        input.projectId,
        input.parentTaskId ?? null,
        input.title,
        input.description,
        input.icon ?? null,
        input.color ?? null,
        input.status,
        input.priority,
        normalizeDate(input.startAt),
        normalizeDate(input.dueAt),
        normalizeDate(input.followUpAt),
        normalizeDate(input.remindAt),
        input.recurrenceRule === "none" ? null : (input.recurrenceRule ?? null),
        input.sortOrder,
        input.createdBy,
        completedAt,
        input.estimatedDurationMinutes ?? null,
      ]
    );

    for (const userId of assigneeIds) {
      await conn.execute(
        `INSERT INTO tbl_task_assignees (id, workspace_id, task_id, user_id)
         VALUES (?, ?, ?, ?)`,
        [createId(), input.workspaceId, id, userId]
      );
    }

    for (const tagId of tagIds) {
      await conn.execute(
        `INSERT INTO tbl_task_tags (id, workspace_id, task_id, tag_id)
         VALUES (?, ?, ?, ?)`,
        [createId(), input.workspaceId, id, tagId]
      );
    }

    await conn.execute(
      `INSERT INTO tbl_activity_logs
        (id, workspace_id, actor_user_id, action, resource_type, resource_id, metadata)
       VALUES (?, ?, ?, 'task.created', 'task', ?, ?)`,
      [
        createId(),
        input.workspaceId,
        input.createdBy,
        id,
        JSON.stringify({ title: input.title }),
      ]
    );
  });

  return id;
}

export async function updateTaskRecord(
  taskId: string,
  workspaceId: string,
  data: {
    title?: string;
    description?: string | null;
    projectId?: string | null;
    parentTaskId?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    icon?: string | null;
    color?: string | null;
    startAt?: string | null;
    dueAt?: string | null;
    followUpAt?: string | null;
    remindAt?: string | null;
    recurrenceRule?: TaskRecurrence | null;
    estimatedDurationMinutes?: number | null;
    actualDurationMinutes?: number | null;
    focusStartedAt?: string | null;
  }
) {
  const sets: string[] = [];
  const params: Record<string, unknown> = { taskId, workspaceId };

  const assign = (column: string, key: string, value: unknown) => {
    sets.push(`${column} = :${key}`);
    params[key] = value;
  };

  if (data.title !== undefined) assign("title", "title", data.title);
  if (data.description !== undefined)
    assign("description", "description", data.description);
  if (data.projectId !== undefined)
    assign("project_id", "projectId", data.projectId);
  if (data.parentTaskId !== undefined)
    assign("parent_task_id", "parentTaskId", data.parentTaskId);
  if (data.priority !== undefined)
    assign("priority", "priority", data.priority);
  if (data.icon !== undefined) assign("icon", "icon", data.icon);
  if (data.color !== undefined) assign("color", "color", data.color);
  if (data.startAt !== undefined)
    assign("start_at", "startAt", normalizeDate(data.startAt));
  if (data.dueAt !== undefined)
    assign("due_at", "dueAt", normalizeDate(data.dueAt));
  if (data.followUpAt !== undefined)
    assign("follow_up_at", "followUpAt", normalizeDate(data.followUpAt));
  if (data.remindAt !== undefined)
    assign("remind_at", "remindAt", normalizeDate(data.remindAt));
  if (data.recurrenceRule !== undefined) {
    assign(
      "recurrence_rule",
      "recurrenceRule",
      data.recurrenceRule === "none" ? null : data.recurrenceRule
    );
  }
  if (data.estimatedDurationMinutes !== undefined) {
    assign(
      "estimated_duration_minutes",
      "estimatedDurationMinutes",
      data.estimatedDurationMinutes
    );
  }
  if (data.actualDurationMinutes !== undefined) {
    assign(
      "actual_duration_minutes",
      "actualDurationMinutes",
      data.actualDurationMinutes
    );
  }
  if (data.focusStartedAt !== undefined) {
    assign(
      "focus_started_at",
      "focusStartedAt",
      normalizeDate(data.focusStartedAt)
    );
  }
  if (data.status !== undefined) {
    assign("status", "status", data.status);
    if (data.status === "completed") {
      sets.push("completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP(3))");
    } else {
      sets.push("completed_at = NULL");
    }
  }

  if (sets.length === 0) return;

  await execute(
    `UPDATE tbl_tasks SET ${sets.join(", ")}
     WHERE id = :taskId AND workspace_id = :workspaceId AND deleted_at IS NULL`,
    params
  );
}

export async function moveTaskRecord(input: {
  taskId: string;
  workspaceId: string;
  status: TaskStatus;
  sortOrder: string;
}) {
  const completedClause =
    input.status === "completed"
      ? "completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP(3))"
      : "completed_at = NULL";

  await execute(
    `UPDATE tbl_tasks
     SET status = :status, sort_order = :sortOrder, ${completedClause}
     WHERE id = :taskId AND workspace_id = :workspaceId AND deleted_at IS NULL`,
    {
      status: input.status,
      sortOrder: input.sortOrder,
      taskId: input.taskId,
      workspaceId: input.workspaceId,
    }
  );
}

export async function softDeleteTask(taskId: string, workspaceId: string) {
  await execute(
    `UPDATE tbl_tasks
     SET deleted_at = CURRENT_TIMESTAMP(3)
     WHERE id = :taskId AND workspace_id = :workspaceId AND deleted_at IS NULL`,
    { taskId, workspaceId }
  );
}

export async function restoreTaskRecord(taskId: string, workspaceId: string) {
  await execute(
    `UPDATE tbl_tasks
     SET deleted_at = NULL
     WHERE id = :taskId AND workspace_id = :workspaceId AND deleted_at IS NOT NULL`,
    { taskId, workspaceId }
  );
}

export async function listAssigneeIds(taskId: string) {
  type Row = RowDataPacket & { user_id: string };
  const rows = await query<Row[]>(
    `SELECT user_id FROM tbl_task_assignees WHERE task_id = :taskId`,
    { taskId }
  );
  return rows.map((r) => r.user_id);
}

export async function listWatcherIds(taskId: string) {
  type Row = RowDataPacket & { user_id: string };
  const rows = await query<Row[]>(
    `SELECT user_id FROM tbl_task_watchers WHERE task_id = :taskId`,
    { taskId }
  );
  return rows.map((r) => r.user_id);
}

export async function replaceTaskAssignees(input: {
  workspaceId: string;
  taskId: string;
  assigneeIds: string[];
}) {
  const ids = [...new Set(input.assigneeIds)];
  await withTransaction(async (conn) => {
    await conn.execute(`DELETE FROM tbl_task_assignees WHERE task_id = ?`, [
      input.taskId,
    ]);
    for (const userId of ids) {
      await conn.execute(
        `INSERT INTO tbl_task_assignees (id, workspace_id, task_id, user_id)
         VALUES (?, ?, ?, ?)`,
        [createId(), input.workspaceId, input.taskId, userId]
      );
    }
  });
}

export async function replaceTaskWatchers(input: {
  workspaceId: string;
  taskId: string;
  watcherIds: string[];
}) {
  const ids = [...new Set(input.watcherIds)];
  await withTransaction(async (conn) => {
    await conn.execute(`DELETE FROM tbl_task_watchers WHERE task_id = ?`, [
      input.taskId,
    ]);
    for (const userId of ids) {
      await conn.execute(
        `INSERT INTO tbl_task_watchers (id, workspace_id, task_id, user_id)
         VALUES (?, ?, ?, ?)`,
        [createId(), input.workspaceId, input.taskId, userId]
      );
    }
  });
}

export async function replaceTaskTags(input: {
  workspaceId: string;
  taskId: string;
  tagIds: string[];
}) {
  const ids = [...new Set(input.tagIds)];
  await withTransaction(async (conn) => {
    await conn.execute(`DELETE FROM tbl_task_tags WHERE task_id = ?`, [
      input.taskId,
    ]);
    for (const tagId of ids) {
      await conn.execute(
        `INSERT INTO tbl_task_tags (id, workspace_id, task_id, tag_id)
         VALUES (?, ?, ?, ?)`,
        [createId(), input.workspaceId, input.taskId, tagId]
      );
    }
  });
}

export type TaskAttachment = {
  id: string;
  fileId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: Date;
};

export async function listAttachmentsForTask(
  taskId: string,
  workspaceId: string
) {
  type Row = RowDataPacket & {
    id: string;
    file_id: string;
    original_filename: string;
    content_type: string;
    size_bytes: number;
    created_at: Date;
  };
  const rows = await query<Row[]>(
    `SELECT a.id, a.file_id, f.original_filename, f.content_type, f.size_bytes, a.created_at
     FROM tbl_task_attachments a
     INNER JOIN tbl_files f ON f.id = a.file_id
     WHERE a.task_id = :taskId
       AND a.workspace_id = :workspaceId
       AND a.deleted_at IS NULL
       AND f.deleted_at IS NULL
     ORDER BY a.created_at DESC`,
    { taskId, workspaceId }
  );
  return rows.map(
    (r): TaskAttachment => ({
      id: r.id,
      fileId: r.file_id,
      filename: r.original_filename,
      contentType: r.content_type,
      sizeBytes: Number(r.size_bytes),
      createdAt: r.created_at,
    })
  );
}

export async function attachFileToTaskRecord(input: {
  workspaceId: string;
  taskId: string;
  fileId: string;
  createdBy: string;
}) {
  const id = createId();
  await execute(
    `INSERT INTO tbl_task_attachments
      (id, workspace_id, task_id, file_id, created_by)
     VALUES (:id, :workspaceId, :taskId, :fileId, :createdBy)
     ON DUPLICATE KEY UPDATE deleted_at = NULL, updated_at = CURRENT_TIMESTAMP(3)`,
    { ...input, id }
  );
  return id;
}

export async function softDeleteTaskAttachment(
  attachmentId: string,
  workspaceId: string
) {
  await execute(
    `UPDATE tbl_task_attachments
     SET deleted_at = CURRENT_TIMESTAMP(3)
     WHERE id = :attachmentId AND workspace_id = :workspaceId AND deleted_at IS NULL`,
    { attachmentId, workspaceId }
  );
}
