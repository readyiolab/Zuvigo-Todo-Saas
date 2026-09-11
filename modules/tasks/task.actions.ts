"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/modules/auth/auth.service";
import {
  type ActionResult,
  failAction,
  isRedirectError,
  okAction,
} from "@/shared/actions/result";
import {
  attachFileToTask,
  createTask,
  deleteTask,
  detachTaskAttachment,
  duplicateTask,
  listTaskAttachments,
  moveTask,
  restoreTask,
  setTaskAssignees,
  setTaskTags,
  setTaskWatchers,
  updateTask,
} from "@/modules/tasks/task.service";

export type { ActionResult };

function revalidateTaskPaths(
  workspaceSlug: string,
  taskId?: string,
  opts?: { light?: boolean }
) {
  if (opts?.light) {
    if (taskId) revalidatePath(`/w/${workspaceSlug}/tasks/${taskId}`);
    return;
  }
  revalidatePath(`/w/${workspaceSlug}/tasks`);
  revalidatePath(`/w/${workspaceSlug}/projects`);
  revalidatePath(`/w/${workspaceSlug}`);
  if (taskId) {
    revalidatePath(`/w/${workspaceSlug}/tasks/${taskId}`);
  }
}

export async function createTaskAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  title: string;
  description?: string | null;
  projectId?: string | null;
  parentTaskId?: string | null;
  status?: string;
  priority?: string;
  icon?: string | null;
  color?: string | null;
  startAt?: string | null;
  dueAt?: string | null;
  followUpAt?: string | null;
  remindAt?: string | null;
  recurrenceRule?: string | null;
  estimatedDurationMinutes?: number | null;
  assigneeIds?: string[];
  tagIds?: string[];
  stayOnList?: boolean;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const task = await createTask(user.id, {
      workspaceId: input.workspaceId,
      title: input.title,
      description: input.description,
      projectId: input.projectId,
      parentTaskId: input.parentTaskId,
      status: input.status,
      priority: input.priority,
      icon: input.icon,
      color: input.color,
      startAt: input.startAt,
      dueAt: input.dueAt,
      followUpAt: input.followUpAt,
      remindAt: input.remindAt,
      recurrenceRule: input.recurrenceRule,
      estimatedDurationMinutes: input.estimatedDurationMinutes,
      assigneeIds: input.assigneeIds ?? [],
      tagIds: input.tagIds ?? [],
    });
    const light = Boolean(input.stayOnList && input.parentTaskId);
    revalidateTaskPaths(input.workspaceSlug, task.id, { light });
    if (light && input.parentTaskId) {
      revalidatePath(`/w/${input.workspaceSlug}/tasks/${input.parentTaskId}`);
    }
    if (input.projectId && !light) {
      revalidatePath(`/w/${input.workspaceSlug}/projects/${input.projectId}`);
    }
    if (input.stayOnList) {
      return okAction({
        taskId: task.id,
        task,
      });
    }
    redirect(`/w/${input.workspaceSlug}/tasks/${task.id}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return failAction(error, "task_action_error");
  }
}

export async function updateTaskAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  taskId: string;
  title?: string;
  description?: string | null;
  projectId?: string | null;
  status?: string;
  priority?: string;
  icon?: string | null;
  color?: string | null;
  startAt?: string | null;
  dueAt?: string | null;
  followUpAt?: string | null;
  remindAt?: string | null;
  recurrenceRule?: string | null;
  estimatedDurationMinutes?: number | null;
  actualDurationMinutes?: number | null;
  focusStartedAt?: string | null;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await updateTask(input.workspaceId, input.taskId, user.id, input);
    // Light revalidate — avoid refreshing home/projects for every property edit
    revalidateTaskPaths(input.workspaceSlug, input.taskId, { light: true });
    return okAction();
  } catch (error) {
    return failAction(error, "task_action_error");
  }
}

export async function deleteTaskAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  taskId: string;
  stayOnList?: boolean;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await deleteTask(input.workspaceId, input.taskId, user.id);
    if (input.stayOnList) {
      revalidateTaskPaths(input.workspaceSlug, input.taskId, { light: true });
      return okAction();
    }
    revalidateTaskPaths(input.workspaceSlug);
    redirect(`/w/${input.workspaceSlug}/tasks`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return failAction(error, "task_action_error");
  }
}

export async function restoreTaskAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  taskId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await restoreTask(input.workspaceId, input.taskId, user.id);
    revalidateTaskPaths(input.workspaceSlug, input.taskId);
    return okAction();
  } catch (error) {
    return failAction(error, "task_action_error");
  }
}

export async function duplicateTaskAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  taskId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const task = await duplicateTask(
      input.workspaceId,
      input.taskId,
      user.id
    );
    revalidateTaskPaths(input.workspaceSlug, task.id);
    redirect(`/w/${input.workspaceSlug}/tasks/${task.id}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return failAction(error, "task_action_error");
  }
}

export async function moveTaskAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  taskId: string;
  status: string;
  sortOrder: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await moveTask(user.id, {
      workspaceId: input.workspaceId,
      taskId: input.taskId,
      status: input.status,
      sortOrder: input.sortOrder,
    });
    revalidateTaskPaths(input.workspaceSlug, input.taskId);
    return okAction();
  } catch (error) {
    return failAction(error, "task_action_error");
  }
}

export async function setTaskAssigneesAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  taskId: string;
  assigneeIds: string[];
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await setTaskAssignees(user.id, {
      workspaceId: input.workspaceId,
      taskId: input.taskId,
      assigneeIds: input.assigneeIds,
    });
    revalidateTaskPaths(input.workspaceSlug, input.taskId);
    return okAction();
  } catch (error) {
    return failAction(error, "task_action_error");
  }
}

export async function setTaskWatchersAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  taskId: string;
  watcherIds: string[];
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await setTaskWatchers(user.id, input);
    revalidateTaskPaths(input.workspaceSlug, input.taskId);
    return okAction();
  } catch (error) {
    return failAction(error, "task_action_error");
  }
}

export async function setTaskTagsAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  taskId: string;
  tagIds: string[];
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await setTaskTags(user.id, input);
    revalidateTaskPaths(input.workspaceSlug, input.taskId);
    return okAction();
  } catch (error) {
    return failAction(error, "task_action_error");
  }
}

export async function attachFileToTaskAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  taskId: string;
  fileId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const attachments = await attachFileToTask(user.id, input);
    revalidateTaskPaths(input.workspaceSlug, input.taskId);
    return okAction({ attachments });
  } catch (error) {
    return failAction(error, "task_action_error");
  }
}

export async function detachTaskAttachmentAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  taskId: string;
  attachmentId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await detachTaskAttachment(user.id, input);
    revalidateTaskPaths(input.workspaceSlug, input.taskId);
    return okAction();
  } catch (error) {
    return failAction(error, "task_action_error");
  }
}

export async function listTaskAttachmentsAction(input: {
  workspaceId: string;
  taskId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const attachments = await listTaskAttachments(
      input.workspaceId,
      input.taskId,
      user.id
    );
    return okAction({ attachments });
  } catch (error) {
    return failAction(error, "task_action_error");
  }
}
