import type { TaskPriority, TaskRecord, TaskStatus } from "@/modules/tasks/task.types";
import { differenceInCalendarDays, isPast, startOfDay } from "date-fns";

export type PriorityReason = string;

export type ScoredTask = {
  task: TaskRecord;
  score: number;
  reasons: PriorityReason[];
  doNext: boolean;
};

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  low: 10,
  medium: 25,
  high: 45,
  urgent: 70,
};

/**
 * Modular heuristic priority score. Replaceable later with an AI model.
 * Higher = do sooner. Does not invent data; only uses present fields.
 */
export function scoreTask(
  task: TaskRecord,
  now: Date = new Date()
): Omit<ScoredTask, "doNext"> {
  if (
    task.status === "completed" ||
    task.status === "cancelled"
  ) {
    return { task, score: -1, reasons: [] };
  }

  let score = PRIORITY_WEIGHT[task.priority] ?? 25;
  const reasons: PriorityReason[] = [];

  reasons.push(`Marked ${task.priority} priority`);

  if (task.dueAt) {
    const due = startOfDay(new Date(task.dueAt));
    const today = startOfDay(now);
    const days = differenceInCalendarDays(due, today);

    if (days < 0) {
      score += 80 + Math.min(40, Math.abs(days) * 5);
      reasons.push("Overdue");
    } else if (days === 0) {
      score += 55;
      reasons.push("Due today");
    } else if (days === 1) {
      score += 40;
      reasons.push("Due tomorrow");
    } else if (days <= 3) {
      score += 25;
      reasons.push("Due within 3 days");
    } else if (days <= 7) {
      score += 10;
      reasons.push("Due this week");
    }
  }

  if (task.status === "in_progress") {
    score += 15;
    reasons.push("Already in progress");
  } else if (task.status === "blocked") {
    score -= 30;
    reasons.push("Blocked");
  }

  const created = task.createdAt ? new Date(task.createdAt) : null;
  if (created) {
    const ageDays = differenceInCalendarDays(now, created);
    if (ageDays >= 14) {
      score += 12;
      reasons.push("Aging on the list");
    } else if (ageDays >= 7) {
      score += 6;
    }
  }

  const estimate = task.estimatedDurationMinutes;
  if (estimate != null) {
    if (estimate <= 30) {
      score += 8;
      reasons.push("Quick win");
    } else if (estimate >= 180) {
      score -= 5;
      reasons.push("Large effort");
    }
  }

  return { task, score, reasons: reasons.slice(0, 4) };
}

export function scoreTasks(tasks: TaskRecord[], now = new Date()): ScoredTask[] {
  const scored = tasks
    .map((t) => scoreTask(t, now))
    .filter((s) => s.score >= 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((s, i) => ({ ...s, doNext: i === 0 }));
}

export function recommendDoNext(
  tasks: TaskRecord[],
  opts?: { excludeIds?: string[]; now?: Date }
): ScoredTask | null {
  const exclude = new Set(opts?.excludeIds ?? []);
  const ranked = scoreTasks(
    tasks.filter((t) => !exclude.has(t.id)),
    opts?.now
  );
  return ranked[0] ?? null;
}

export function explainRecommendation(scored: ScoredTask): string {
  const top = scored.reasons.slice(0, 3);
  if (top.length === 0) return "This looks like a good next step.";
  if (top.length === 1) return `High priority because it is ${top[0].toLowerCase()}.`;
  return `High priority because ${top.map((r) => r.toLowerCase()).join(", ")}.`;
}

export function formatDurationMinutes(minutes: number | null | undefined): string | null {
  if (minutes == null || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return h === 1 ? "1 hour" : `${h} hours`;
  return `${h}h ${m}m`;
}

export function isOpenStatus(status: TaskStatus) {
  return status !== "completed" && status !== "cancelled";
}
