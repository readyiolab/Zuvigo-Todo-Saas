import { assertWorkspaceAccess } from "@/modules/workspaces/workspace.service";
import { findProjectById } from "@/modules/projects/project.repository";
import {
  listMembers,
  insertActivity,
} from "@/modules/workspaces/workspace.repository";
import { insertNotification } from "@/modules/notifications/notification.service";
import { enqueueJob } from "@/infrastructure/queue/client";
import { notFoundError, validationError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import {
  createTaskSchema,
  moveTaskSchema,
  setAssigneesSchema,
  setTaskTagsSchema,
  setWatchersSchema,
  updateTaskSchema,
} from "@/modules/tasks/task.schema";
import type {
  TaskDueFilter,
  TaskPriority,
  TaskRecord,
  TaskRecurrence,
  TaskSort,
  TaskStatus,
} from "@/modules/tasks/task.types";
import {
  attachFileToTaskRecord,
  createTaskRecord,
  findTaskById,
  getMaxTaskSortOrder,
  listAssigneeIds,
  listAttachmentsForTask,
  listTasksByWorkspace,
  listWatcherIds,
  moveTaskRecord,
  nextSortAfter,
  replaceTaskAssignees,
  replaceTaskTags,
  replaceTaskWatchers,
  restoreTaskRecord,
  softDeleteTask,
  softDeleteTaskAttachment,
  updateTaskRecord,
} from "@/modules/tasks/task.repository";
import { query, type RowDataPacket } from "@/infrastructure/database/connection";

export type { TaskRecord, TaskStatus };

async function assertProjectInWorkspace(
  workspaceId: string,
  projectId: string | null | undefined
) {
  if (!projectId) return;
  const project = await findProjectById(projectId, workspaceId);
  if (!project) throw notFoundError("Project not found");
}

async function assertMembers(
  workspaceId: string,
  userIds: string[],
  label = "Assignees"
) {
  if (userIds.length === 0) return;
  const members = await listMembers(workspaceId);
  const memberIds = new Set(members.map((m) => m.userId));
  for (const id of userIds) {
    if (!memberIds.has(id)) {
      throw validationError(`${label} must be workspace members`);
    }
  }
}

function shiftDueDate(dueAt: Date | null, rule: TaskRecurrence): Date | null {
  const base = dueAt ? new Date(dueAt) : new Date();
  const next = new Date(base);
  if (rule === "daily") next.setDate(next.getDate() + 1);
  else if (rule === "weekly") next.setDate(next.getDate() + 7);
  else if (rule === "monthly") next.setMonth(next.getMonth() + 1);
  else return null;
  return next;
}

async function maybeScheduleReminder(input: {
  workspaceId: string;
  taskId: string;
  remindAt: string | null | undefined;
  actorUserId: string;
}) {
  if (!input.remindAt) return;
  const when = Date.parse(input.remindAt);
  if (Number.isNaN(when)) return;
  const delay = Math.max(0, when - Date.now());
  await enqueueJob(
    "task.reminder",
    {
      workspaceId: input.workspaceId,
      taskId: input.taskId,
      actorUserId: input.actorUserId,
    },
    { jobId: `task-reminder:${input.taskId}:${when}`, delay }
  );
}

export async function listTasks(
  workspaceId: string,
  userId: string,
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
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "tasks.read",
  });
  return listTasksByWorkspace(workspaceId, {
    ...filters,
    parentTaskId: filters?.parentTaskId ?? null,
  });
}

export async function getTask(
  workspaceId: string,
  taskId: string,
  userId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "tasks.read",
  });
  const task = await findTaskById(taskId, workspaceId);
  if (!task) throw notFoundError("Task not found");
  return task;
}

export async function createTask(userId: string, raw: unknown) {
  const parsed = createTaskSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid task data", parsed.error.flatten());
  }

  await assertWorkspaceAccess({
    workspaceId: parsed.data.workspaceId,
    userId,
    permission: "tasks.create",
  });

  await assertProjectInWorkspace(
    parsed.data.workspaceId,
    parsed.data.projectId
  );

  if (parsed.data.parentTaskId) {
    const parent = await findTaskById(
      parsed.data.parentTaskId,
      parsed.data.workspaceId
    );
    if (!parent) throw notFoundError("Parent task not found");
  }

  await assertMembers(parsed.data.workspaceId, parsed.data.assigneeIds);

  const last = await getMaxTaskSortOrder(
    parsed.data.workspaceId,
    parsed.data.status,
    parsed.data.projectId ?? null
  );

  const taskId = await createTaskRecord({
    workspaceId: parsed.data.workspaceId,
    projectId: parsed.data.projectId ?? null,
    parentTaskId: parsed.data.parentTaskId ?? null,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    icon: parsed.data.icon ?? null,
    color: parsed.data.color ?? null,
    status: parsed.data.status,
    priority: parsed.data.priority,
    startAt: parsed.data.startAt ?? null,
    dueAt: parsed.data.dueAt ?? null,
    followUpAt: parsed.data.followUpAt ?? null,
    remindAt: parsed.data.remindAt ?? null,
    recurrenceRule: parsed.data.recurrenceRule ?? null,
    estimatedDurationMinutes: parsed.data.estimatedDurationMinutes ?? null,
    createdBy: userId,
    sortOrder: nextSortAfter(last),
    assigneeIds: parsed.data.assigneeIds,
    tagIds: parsed.data.tagIds,
  });

  for (const assigneeId of parsed.data.assigneeIds) {
    if (assigneeId === userId) continue;
    await insertNotification({
      workspaceId: parsed.data.workspaceId,
      userId: assigneeId,
      type: "task.assigned",
      title: "You were assigned a task",
      body: parsed.data.title,
      resourceType: "task",
      resourceId: taskId,
    });
  }

  await maybeScheduleReminder({
    workspaceId: parsed.data.workspaceId,
    taskId,
    remindAt: parsed.data.remindAt,
    actorUserId: userId,
  });

  logger.info("task_created", { taskId, userId });
  const task = await findTaskById(taskId, parsed.data.workspaceId);
  if (!task) throw notFoundError("Task not found");
  return task;
}

export async function updateTask(
  workspaceId: string,
  taskId: string,
  userId: string,
  raw: unknown
) {
  const parsed = updateTaskSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid task update", parsed.error.flatten());
  }

  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "tasks.update",
  });

  const existing = await findTaskById(taskId, workspaceId);
  if (!existing) throw notFoundError("Task not found");

  if (parsed.data.projectId !== undefined) {
    await assertProjectInWorkspace(workspaceId, parsed.data.projectId);
  }

  const wasCompleted = existing.status === "completed";
  await updateTaskRecord(taskId, workspaceId, parsed.data);

  await insertActivity({
    workspaceId,
    actorUserId: userId,
    action: "task.updated",
    resourceType: "task",
    resourceId: taskId,
    metadata: parsed.data as Record<string, unknown>,
  });

  if (parsed.data.remindAt !== undefined) {
    await maybeScheduleReminder({
      workspaceId,
      taskId,
      remindAt: parsed.data.remindAt,
      actorUserId: userId,
    });
  }

  const updated = await findTaskById(taskId, workspaceId);
  if (!updated) throw notFoundError("Task not found");

  // Recurrence: when newly completed, spawn next
  if (
    !wasCompleted &&
    updated.status === "completed" &&
    updated.recurrenceRule &&
    updated.recurrenceRule !== "none"
  ) {
    const nextDue = shiftDueDate(updated.dueAt, updated.recurrenceRule);
    await createTask(userId, {
      workspaceId,
      title: updated.title,
      description: updated.description,
      projectId: updated.projectId,
      parentTaskId: updated.parentTaskId,
      status: "todo",
      priority: updated.priority,
      icon: updated.icon,
      color: updated.color,
      dueAt: nextDue ? nextDue.toISOString() : null,
      recurrenceRule: updated.recurrenceRule,
      estimatedDurationMinutes: updated.estimatedDurationMinutes,
      assigneeIds: updated.assignees.map((a) => a.userId),
      tagIds: (updated.tags ?? []).map((t) => t.id),
    });
  }

  return updated;
}

export async function deleteTask(
  workspaceId: string,
  taskId: string,
  userId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "tasks.delete",
  });

  const existing = await findTaskById(taskId, workspaceId);
  if (!existing) throw notFoundError("Task not found");

  await softDeleteTask(taskId, workspaceId);
  await insertActivity({
    workspaceId,
    actorUserId: userId,
    action: "task.deleted",
    resourceType: "task",
    resourceId: taskId,
    metadata: { title: existing.title },
  });
  logger.info("task_deleted", { taskId, userId });
}

export async function restoreTask(
  workspaceId: string,
  taskId: string,
  userId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "tasks.update",
  });
  await restoreTaskRecord(taskId, workspaceId);
  await insertActivity({
    workspaceId,
    actorUserId: userId,
    action: "task.restored",
    resourceType: "task",
    resourceId: taskId,
  });
}

export async function duplicateTask(
  workspaceId: string,
  taskId: string,
  userId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "tasks.create",
  });
  const existing = await findTaskById(taskId, workspaceId);
  if (!existing) throw notFoundError("Task not found");

  return createTask(userId, {
    workspaceId,
    title: `${existing.title} (copy)`,
    description: existing.description,
    projectId: existing.projectId,
    parentTaskId: existing.parentTaskId,
    status: "todo",
    priority: existing.priority,
    icon: existing.icon,
    color: existing.color,
    startAt: existing.startAt ? existing.startAt.toISOString() : null,
    dueAt: existing.dueAt ? existing.dueAt.toISOString() : null,
    followUpAt: existing.followUpAt
      ? existing.followUpAt.toISOString()
      : null,
    recurrenceRule: existing.recurrenceRule,
    assigneeIds: [],
    tagIds: (existing.tags ?? []).map((t) => t.id),
  });
}

export async function moveTask(userId: string, raw: unknown) {
  const parsed = moveTaskSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid task move", parsed.error.flatten());
  }

  await assertWorkspaceAccess({
    workspaceId: parsed.data.workspaceId,
    userId,
    permission: "tasks.update",
  });

  const task = await findTaskById(
    parsed.data.taskId,
    parsed.data.workspaceId
  );
  if (!task) throw notFoundError("Task not found");

  await moveTaskRecord({
    taskId: parsed.data.taskId,
    workspaceId: parsed.data.workspaceId,
    status: parsed.data.status,
    sortOrder: parsed.data.sortOrder,
  });

  await insertActivity({
    workspaceId: parsed.data.workspaceId,
    actorUserId: userId,
    action: "task.status_changed",
    resourceType: "task",
    resourceId: parsed.data.taskId,
    metadata: { status: parsed.data.status },
  });

  const updated = await findTaskById(
    parsed.data.taskId,
    parsed.data.workspaceId
  );

  if (
    task.status !== "completed" &&
    parsed.data.status === "completed" &&
    updated?.recurrenceRule &&
    updated.recurrenceRule !== "none"
  ) {
    const nextDue = shiftDueDate(updated.dueAt, updated.recurrenceRule);
    await createTask(userId, {
      workspaceId: parsed.data.workspaceId,
      title: updated.title,
      description: updated.description,
      projectId: updated.projectId,
      status: "todo",
      priority: updated.priority,
      icon: updated.icon,
      color: updated.color,
      dueAt: nextDue ? nextDue.toISOString() : null,
      recurrenceRule: updated.recurrenceRule,
      estimatedDurationMinutes: updated.estimatedDurationMinutes,
      assigneeIds: updated.assignees.map((a) => a.userId),
      tagIds: (updated.tags ?? []).map((t) => t.id),
    });
  }

  return updated;
}

export async function setTaskAssignees(userId: string, raw: unknown) {
  const parsed = setAssigneesSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid assignees", parsed.error.flatten());
  }

  await assertWorkspaceAccess({
    workspaceId: parsed.data.workspaceId,
    userId,
    permission: "tasks.update",
  });

  const task = await findTaskById(
    parsed.data.taskId,
    parsed.data.workspaceId
  );
  if (!task) throw notFoundError("Task not found");

  await assertMembers(parsed.data.workspaceId, parsed.data.assigneeIds);

  const previous = new Set(await listAssigneeIds(parsed.data.taskId));
  await replaceTaskAssignees({
    workspaceId: parsed.data.workspaceId,
    taskId: parsed.data.taskId,
    assigneeIds: parsed.data.assigneeIds,
  });

  for (const assigneeId of parsed.data.assigneeIds) {
    if (previous.has(assigneeId) || assigneeId === userId) continue;
    await insertNotification({
      workspaceId: parsed.data.workspaceId,
      userId: assigneeId,
      type: "task.assigned",
      title: "You were assigned a task",
      body: task.title,
      resourceType: "task",
      resourceId: task.id,
    });
  }

  await insertActivity({
    workspaceId: parsed.data.workspaceId,
    actorUserId: userId,
    action: "task.assignees_changed",
    resourceType: "task",
    resourceId: task.id,
    metadata: { assigneeIds: parsed.data.assigneeIds },
  });

  return findTaskById(parsed.data.taskId, parsed.data.workspaceId);
}

export async function setTaskWatchers(userId: string, raw: unknown) {
  const parsed = setWatchersSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid watchers", parsed.error.flatten());
  }
  await assertWorkspaceAccess({
    workspaceId: parsed.data.workspaceId,
    userId,
    permission: "tasks.update",
  });
  const task = await findTaskById(
    parsed.data.taskId,
    parsed.data.workspaceId
  );
  if (!task) throw notFoundError("Task not found");
  await assertMembers(
    parsed.data.workspaceId,
    parsed.data.watcherIds,
    "Watchers"
  );
  await replaceTaskWatchers({
    workspaceId: parsed.data.workspaceId,
    taskId: parsed.data.taskId,
    watcherIds: parsed.data.watcherIds,
  });
  return findTaskById(parsed.data.taskId, parsed.data.workspaceId);
}

export async function setTaskTags(userId: string, raw: unknown) {
  const parsed = setTaskTagsSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid tags", parsed.error.flatten());
  }
  await assertWorkspaceAccess({
    workspaceId: parsed.data.workspaceId,
    userId,
    permission: "tasks.update",
  });
  const task = await findTaskById(
    parsed.data.taskId,
    parsed.data.workspaceId
  );
  if (!task) throw notFoundError("Task not found");
  await replaceTaskTags({
    workspaceId: parsed.data.workspaceId,
    taskId: parsed.data.taskId,
    tagIds: parsed.data.tagIds,
  });
  return findTaskById(parsed.data.taskId, parsed.data.workspaceId);
}

export async function listTaskAttachments(
  workspaceId: string,
  taskId: string,
  userId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "tasks.read",
  });
  const task = await findTaskById(taskId, workspaceId);
  if (!task) throw notFoundError("Task not found");
  return listAttachmentsForTask(taskId, workspaceId);
}

export async function attachFileToTask(
  userId: string,
  input: { workspaceId: string; taskId: string; fileId: string }
) {
  await assertWorkspaceAccess({
    workspaceId: input.workspaceId,
    userId,
    permission: "tasks.update",
  });
  const task = await findTaskById(input.taskId, input.workspaceId);
  if (!task) throw notFoundError("Task not found");

  type FileRow = RowDataPacket & { id: string; status: string };
  const files = await query<FileRow[]>(
    `SELECT id, status FROM tbl_files
     WHERE id = :fileId AND workspace_id = :workspaceId AND deleted_at IS NULL
     LIMIT 1`,
    { fileId: input.fileId, workspaceId: input.workspaceId }
  );
  if (!files[0] || files[0].status !== "ready") {
    throw notFoundError("File not found");
  }

  await attachFileToTaskRecord({
    workspaceId: input.workspaceId,
    taskId: input.taskId,
    fileId: input.fileId,
    createdBy: userId,
  });
  await insertActivity({
    workspaceId: input.workspaceId,
    actorUserId: userId,
    action: "task.attachment_added",
    resourceType: "task",
    resourceId: input.taskId,
    metadata: { fileId: input.fileId },
  });
  return listAttachmentsForTask(input.taskId, input.workspaceId);
}

export async function detachTaskAttachment(
  userId: string,
  input: { workspaceId: string; attachmentId: string; taskId: string }
) {
  await assertWorkspaceAccess({
    workspaceId: input.workspaceId,
    userId,
    permission: "tasks.update",
  });
  await softDeleteTaskAttachment(input.attachmentId, input.workspaceId);
  await insertActivity({
    workspaceId: input.workspaceId,
    actorUserId: userId,
    action: "task.attachment_removed",
    resourceType: "task",
    resourceId: input.taskId,
    metadata: { attachmentId: input.attachmentId },
  });
}

export async function notifyTaskWatchersAndAssignees(input: {
  workspaceId: string;
  taskId: string;
  actorUserId: string;
  type: string;
  title: string;
  body?: string;
}) {
  const [assignees, watchers] = await Promise.all([
    listAssigneeIds(input.taskId),
    listWatcherIds(input.taskId),
  ]);
  const recipients = new Set([...assignees, ...watchers]);
  recipients.delete(input.actorUserId);
  for (const userId of recipients) {
    await insertNotification({
      workspaceId: input.workspaceId,
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      resourceType: "task",
      resourceId: input.taskId,
    });
  }
}
