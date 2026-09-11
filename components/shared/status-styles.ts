import type { ProjectStatus } from "@/modules/projects/project.types";
import type {
  TaskPriority,
  TaskStatus,
} from "@/modules/tasks/task.types";

export type SoftTone = "muted" | "info" | "success" | "warning" | "danger";

export const SOFT_TONE_VARIANT: Record<
  SoftTone,
  "soft" | "info" | "success" | "warning" | "danger"
> = {
  muted: "soft",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
};

export const TASK_STATUS_TONE: Record<TaskStatus, SoftTone> = {
  todo: "muted",
  in_progress: "info",
  blocked: "warning",
  cancelled: "muted",
  completed: "success",
};

export const TASK_PRIORITY_TONE: Record<TaskPriority, SoftTone> = {
  low: "muted",
  medium: "info",
  high: "warning",
  urgent: "danger",
};

export const PROJECT_STATUS_TONE: Record<ProjectStatus, SoftTone> = {
  planned: "muted",
  active: "info",
  on_hold: "warning",
  completed: "success",
  archived: "muted",
};

/** @deprecated Prefer Badge variant via SOFT_TONE_VARIANT */
export const SOFT_TONE_BADGE: Record<SoftTone, string> = {
  muted: "bg-muted text-muted-foreground",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-foreground dark:text-warning",
  danger: "bg-destructive-soft text-destructive",
};

/** Compact soft chips for list/board/detail (reuse semantic soft tokens). */
export const SOFT_CHIP: Record<SoftTone, string> = {
  muted: "bg-muted/60 text-muted-foreground",
  info: "bg-info-soft/80 text-info",
  success: "bg-success-soft/80 text-success",
  warning: "bg-warning-soft/80 text-warning-foreground dark:text-warning",
  danger: "bg-destructive-soft/80 text-destructive",
};

export const CHIP_BASE =
  "inline-flex max-w-full items-center truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none opacity-90";

export function softChipClass(tone: SoftTone, className?: string) {
  return [CHIP_BASE, SOFT_CHIP[tone], className].filter(Boolean).join(" ");
}

/** Board column chrome keyed by task status. */
export const TASK_STATUS_COLUMN: Record<
  TaskStatus,
  { bar: string; panel: string; count: string }
> = {
  todo: {
    bar: "bg-muted-foreground/40",
    panel: "bg-muted/40",
    count: "bg-muted text-muted-foreground",
  },
  in_progress: {
    bar: "bg-info",
    panel: "bg-info-soft/60",
    count: "bg-info-soft text-info",
  },
  blocked: {
    bar: "bg-warning",
    panel: "bg-warning-soft/60",
    count: "bg-warning-soft text-warning-foreground dark:text-warning",
  },
  cancelled: {
    bar: "bg-muted-foreground/30",
    panel: "bg-muted/30",
    count: "bg-muted text-muted-foreground",
  },
  completed: {
    bar: "bg-success",
    panel: "bg-success-soft/60",
    count: "bg-success-soft text-success",
  },
};

/** Home launch tile accents. */
export const LAUNCH_ACCENTS = {
  pages: {
    well: "bg-primary-soft text-primary",
    ring: "hover:border-primary/30",
  },
  projects: {
    well: "bg-warning-soft text-warning-foreground dark:text-warning",
    ring: "hover:border-warning/40",
  },
  tasks: {
    well: "bg-success-soft text-success",
    ring: "hover:border-success/30",
  },
} as const;
