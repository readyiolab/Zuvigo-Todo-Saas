"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/auth/auth.service";
import {
  type ActionResult,
  failAction,
  okAction,
} from "@/shared/actions/result";
import { listTasks, updateTask, createTask } from "@/modules/tasks/task.service";
import { assertWorkspaceAccess } from "@/modules/workspaces/workspace.service";
import {
  explainRecommendation,
  recommendDoNext,
  scoreTasks,
} from "@/modules/productivity/priority.service";
import { buildDailyPlan } from "@/modules/productivity/planner.service";
import {
  getDailyPlan,
  upsertDailyPlan,
  getNotificationPrefs,
  upsertNotificationPrefs,
  type NotificationPrefs,
} from "@/modules/productivity/plan.repository";
import {
  breakDownTask,
  explainRecommendation as aiExplain,
} from "@/modules/ai/ai.service";
import { format } from "date-fns";

export async function getNextTaskAction(input: {
  workspaceId: string;
  excludeIds?: string[];
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await assertWorkspaceAccess({
      workspaceId: input.workspaceId,
      userId: user.id,
      permission: "tasks.read",
    });
    const tasks = await listTasks(input.workspaceId, user.id, {
      parentTaskId: null,
    });
    const open = tasks.filter(
      (t) => t.status !== "completed" && t.status !== "cancelled"
    );
    const next = recommendDoNext(open, { excludeIds: input.excludeIds });
    if (!next) return okAction(null);

    let explanation = explainRecommendation(next);
    try {
      explanation = await aiExplain({
        title: next.task.title,
        reasons: next.reasons,
      });
    } catch {
      /* keep heuristic */
    }

    return okAction({
      taskId: next.task.id,
      title: next.task.title,
      reasons: next.reasons,
      explanation,
      estimatedDurationMinutes: next.task.estimatedDurationMinutes,
      dueAt: next.task.dueAt ? new Date(next.task.dueAt).toISOString() : null,
    });
  } catch (error) {
    return failAction(error, "productivity_action_error");
  }
}

export async function generateDailyPlanAction(input: {
  workspaceId: string;
  workspaceSlug: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await assertWorkspaceAccess({
      workspaceId: input.workspaceId,
      userId: user.id,
      permission: "tasks.read",
    });
    const tasks = await listTasks(input.workspaceId, user.id, {
      parentTaskId: null,
    });
    const open = tasks.filter(
      (t) => t.status !== "completed" && t.status !== "cancelled"
    );
    const plan = buildDailyPlan(open);
    await upsertDailyPlan({
      workspaceId: input.workspaceId,
      userId: user.id,
      planDate: plan.date,
      slots: plan.slots,
    });
    revalidatePath(`/w/${input.workspaceSlug}`);
    return okAction({ planDate: plan.date, slots: plan.slots });
  } catch (error) {
    return failAction(error, "productivity_action_error");
  }
}

export async function loadDailyPlanAction(input: {
  workspaceId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await assertWorkspaceAccess({
      workspaceId: input.workspaceId,
      userId: user.id,
      permission: "tasks.read",
    });
    const planDate = format(new Date(), "yyyy-MM-dd");
    const existing = await getDailyPlan({
      workspaceId: input.workspaceId,
      userId: user.id,
      planDate,
    });
    if (existing) {
      return okAction({ planDate: existing.planDate, slots: existing.slots });
    }
    return okAction(null);
  } catch (error) {
    return failAction(error, "productivity_action_error");
  }
}

export async function breakDownTaskAction(input: {
  workspaceId: string;
  title: string;
  description?: string | null;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await assertWorkspaceAccess({
      workspaceId: input.workspaceId,
      userId: user.id,
      permission: "tasks.read",
    });
    const result = await breakDownTask({
      title: input.title,
      description: input.description,
    });
    return okAction(result);
  } catch (error) {
    return failAction(error, "productivity_action_error");
  }
}

export async function addSuggestedSubtasksAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  parentTaskId: string;
  titles: string[];
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const created = [];
    for (const title of input.titles) {
      if (!title.trim()) continue;
      const task = await createTask(user.id, {
        workspaceId: input.workspaceId,
        title: title.trim(),
        parentTaskId: input.parentTaskId,
        status: "todo",
        priority: "medium",
      });
      created.push(task);
    }
    revalidatePath(`/w/${input.workspaceSlug}/tasks`);
    revalidatePath(`/w/${input.workspaceSlug}/tasks/${input.parentTaskId}`);
    return okAction({ tasks: created });
  } catch (error) {
    return failAction(error, "productivity_action_error");
  }
}

export async function startFocusAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  taskId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await updateTask(input.workspaceId, input.taskId, user.id, {
      focusStartedAt: new Date().toISOString(),
      status: "in_progress",
    });
    revalidatePath(`/w/${input.workspaceSlug}`);
    revalidatePath(`/w/${input.workspaceSlug}/tasks/${input.taskId}`);
    revalidatePath(`/w/${input.workspaceSlug}/focus/${input.taskId}`);
    return okAction();
  } catch (error) {
    return failAction(error, "productivity_action_error");
  }
}

export async function completeFocusAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  taskId: string;
  markDone?: boolean;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const tasks = await listTasks(input.workspaceId, user.id);
    const task = tasks.find((t) => t.id === input.taskId);
    if (!task) throw new Error("Task not found");

    let actual = task.actualDurationMinutes ?? 0;
    if (task.focusStartedAt) {
      const elapsed = Math.max(
        1,
        Math.round(
          (Date.now() - new Date(task.focusStartedAt).getTime()) / 60000
        )
      );
      actual += elapsed;
    }

    await updateTask(input.workspaceId, input.taskId, user.id, {
      focusStartedAt: null,
      actualDurationMinutes: actual,
      ...(input.markDone !== false ? { status: "completed" as const } : {}),
    });
    revalidatePath(`/w/${input.workspaceSlug}`);
    revalidatePath(`/w/${input.workspaceSlug}/tasks`);
    revalidatePath(`/w/${input.workspaceSlug}/analytics`);
    return okAction();
  } catch (error) {
    return failAction(error, "productivity_action_error");
  }
}

export async function pauseFocusAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  taskId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const tasks = await listTasks(input.workspaceId, user.id);
    const task = tasks.find((t) => t.id === input.taskId);
    if (!task) throw new Error("Task not found");

    let actual = task.actualDurationMinutes ?? 0;
    if (task.focusStartedAt) {
      const elapsed = Math.max(
        1,
        Math.round(
          (Date.now() - new Date(task.focusStartedAt).getTime()) / 60000
        )
      );
      actual += elapsed;
    }

    await updateTask(input.workspaceId, input.taskId, user.id, {
      focusStartedAt: null,
      actualDurationMinutes: actual,
    });
    revalidatePath(`/w/${input.workspaceSlug}/focus/${input.taskId}`);
    return okAction();
  } catch (error) {
    return failAction(error, "productivity_action_error");
  }
}

export async function saveNotificationPrefsAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  prefs: NotificationPrefs;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await assertWorkspaceAccess({
      workspaceId: input.workspaceId,
      userId: user.id,
      permission: "tasks.read",
    });
    await upsertNotificationPrefs({
      workspaceId: input.workspaceId,
      userId: user.id,
      prefs: input.prefs,
    });
    revalidatePath(`/w/${input.workspaceSlug}/settings`);
    return okAction();
  } catch (error) {
    return failAction(error, "productivity_action_error");
  }
}

export async function loadNotificationPrefsAction(input: {
  workspaceId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const prefs = await getNotificationPrefs({
      workspaceId: input.workspaceId,
      userId: user.id,
    });
    return okAction(prefs);
  } catch (error) {
    return failAction(error, "productivity_action_error");
  }
}

export async function scoreOpenTasksAction(input: {
  workspaceId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const tasks = await listTasks(input.workspaceId, user.id, {
      parentTaskId: null,
    });
    const scored = scoreTasks(
      tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled")
    );
    return okAction(
      scored.map((s) => ({
        taskId: s.task.id,
        score: s.score,
        reasons: s.reasons,
      }))
    );
  } catch (error) {
    return failAction(error, "productivity_action_error");
  }
}
