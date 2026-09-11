import type { TaskRecord } from "@/modules/tasks/task.types";
import {
  formatDurationMinutes,
  scoreTasks,
  type ScoredTask,
} from "@/modules/productivity/priority.service";
import { addMinutes, format, setHours, setMinutes, startOfDay } from "date-fns";

export type PlanSlot = {
  taskId: string;
  title: string;
  start: string; // ISO
  end: string; // ISO
  estimatedMinutes: number;
  score: number;
};

export type DailyPlanResult = {
  date: string; // yyyy-MM-dd
  slots: PlanSlot[];
  unscheduled: Array<{ taskId: string; title: string; reason: string }>;
};

const DEFAULT_START_HOUR = 9;
const DEFAULT_END_HOUR = 17;
const DEFAULT_ESTIMATE = 45;

/**
 * Pack incomplete tasks into work-day slots by score.
 * Never overbooks available minutes. Pure heuristic (no AI required).
 */
export function buildDailyPlan(
  tasks: TaskRecord[],
  opts?: {
    date?: Date;
    workStartHour?: number;
    workEndHour?: number;
    maxTasks?: number;
  }
): DailyPlanResult {
  const day = startOfDay(opts?.date ?? new Date());
  const startHour = opts?.workStartHour ?? DEFAULT_START_HOUR;
  const endHour = opts?.workEndHour ?? DEFAULT_END_HOUR;
  const capacity =
    Math.max(0, endHour - startHour) * 60;

  const ranked = scoreTasks(tasks).slice(0, opts?.maxTasks ?? 20);
  const slots: PlanSlot[] = [];
  const unscheduled: DailyPlanResult["unscheduled"] = [];

  let cursor = setMinutes(setHours(day, startHour), 0);
  const dayEnd = setMinutes(setHours(day, endHour), 0);
  let used = 0;

  for (const scored of ranked) {
    const minutes =
      scored.task.estimatedDurationMinutes &&
      scored.task.estimatedDurationMinutes > 0
        ? scored.task.estimatedDurationMinutes
        : DEFAULT_ESTIMATE;

    if (used + minutes > capacity) {
      unscheduled.push({
        taskId: scored.task.id,
        title: scored.task.title,
        reason: "Not enough time left today",
      });
      continue;
    }

    const start = cursor;
    const end = addMinutes(start, minutes);
    if (end > dayEnd) {
      unscheduled.push({
        taskId: scored.task.id,
        title: scored.task.title,
        reason: "Would run past end of day",
      });
      continue;
    }

    slots.push({
      taskId: scored.task.id,
      title: scored.task.title,
      start: start.toISOString(),
      end: end.toISOString(),
      estimatedMinutes: minutes,
      score: scored.score,
    });

    cursor = end;
    used += minutes;
  }

  return {
    date: format(day, "yyyy-MM-dd"),
    slots,
    unscheduled,
  };
}

export function formatSlotTime(iso: string) {
  return format(new Date(iso), "HH:mm");
}

export function slotCaption(scored: ScoredTask) {
  const parts = [
    scored.task.dueAt
      ? undefined
      : null,
    formatDurationMinutes(scored.task.estimatedDurationMinutes),
  ].filter(Boolean);
  return parts.join(" · ");
}
