import type { TaskRecord } from "@/modules/tasks/task.types";
import {
  differenceInCalendarDays,
  isPast,
  isToday,
  startOfDay,
  subDays,
} from "date-fns";

export type ProductivityAnalytics = {
  completedCount: number;
  overdueCount: number;
  openCount: number;
  completionRate: number | null;
  timeSpentMinutes: number;
  estimatedMinutes: number;
  estimateSkewRatio: number | null;
  weekCompleted: number;
  monthCompleted: number;
  insight: string | null;
};

function isOpen(task: TaskRecord) {
  return task.status !== "completed" && task.status !== "cancelled";
}

export function computeProductivityAnalytics(
  tasks: TaskRecord[],
  now = new Date()
): ProductivityAnalytics {
  const weekAgo = subDays(now, 7);
  const monthAgo = subDays(now, 30);

  let completedCount = 0;
  let overdueCount = 0;
  let openCount = 0;
  let timeSpentMinutes = 0;
  let estimatedMinutes = 0;
  let estimateSamples = 0;
  let estimateSum = 0;
  let actualSum = 0;
  let weekCompleted = 0;
  let monthCompleted = 0;

  for (const task of tasks) {
    if (task.parentTaskId) continue;

    if (task.status === "completed") {
      completedCount += 1;
      if (task.completedAt) {
        const done = new Date(task.completedAt);
        if (done >= weekAgo) weekCompleted += 1;
        if (done >= monthAgo) monthCompleted += 1;
      }
    } else if (isOpen(task)) {
      openCount += 1;
      if (
        task.dueAt &&
        isPast(startOfDay(new Date(task.dueAt))) &&
        !isToday(new Date(task.dueAt))
      ) {
        overdueCount += 1;
      }
    }

    if (task.actualDurationMinutes) {
      timeSpentMinutes += task.actualDurationMinutes;
    }
    if (task.estimatedDurationMinutes) {
      estimatedMinutes += task.estimatedDurationMinutes;
    }
    if (
      task.estimatedDurationMinutes &&
      task.actualDurationMinutes &&
      task.estimatedDurationMinutes > 0
    ) {
      estimateSamples += 1;
      estimateSum += task.estimatedDurationMinutes;
      actualSum += task.actualDurationMinutes;
    }
  }

  const denom = completedCount + openCount;
  const completionRate = denom > 0 ? completedCount / denom : null;
  const estimateSkewRatio =
    estimateSamples >= 3 && estimateSum > 0 ? actualSum / estimateSum : null;

  let insight: string | null = null;
  if (estimateSkewRatio != null) {
    if (estimateSkewRatio > 1.25) {
      insight =
        "You often take longer than estimated — add buffer to large tasks.";
    } else if (estimateSkewRatio < 0.75) {
      insight =
        "You finish faster than estimated — you may be underscheduling the day.";
    } else {
      insight = "Your estimates track closely with actual focus time.";
    }
  } else if (overdueCount > 3) {
    insight = "Several tasks are overdue — clear blockers or reschedule.";
  } else if (weekCompleted === 0 && openCount > 0) {
    insight = "No completions this week yet — pick one quick win to start.";
  }

  return {
    completedCount,
    overdueCount,
    openCount,
    completionRate,
    timeSpentMinutes,
    estimatedMinutes,
    estimateSkewRatio,
    weekCompleted,
    monthCompleted,
    insight,
  };
}

export function ageInDays(task: TaskRecord, now = new Date()) {
  if (!task.createdAt) return null;
  return differenceInCalendarDays(now, new Date(task.createdAt));
}
