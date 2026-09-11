export type TaskStatus =
  | "todo"
  | "in_progress"
  | "blocked"
  | "cancelled"
  | "completed";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskRecurrence = "none" | "daily" | "weekly" | "monthly";

export type TaskAssignee = {
  userId: string;
  name: string;
  email: string;
};

export type TaskTag = {
  id: string;
  name: string;
  color: string | null;
};

export type TaskWatcher = {
  userId: string;
  name: string;
  email: string;
};

export type TaskRecord = {
  id: string;
  workspaceId: string;
  projectId: string | null;
  projectName: string | null;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startAt: Date | null;
  dueAt: Date | null;
  followUpAt: Date | null;
  remindAt: Date | null;
  recurrenceRule: TaskRecurrence | null;
  sortOrder: string;
  createdBy: string;
  createdAt: Date | null;
  completedAt: Date | null;
  estimatedDurationMinutes: number | null;
  actualDurationMinutes: number | null;
  focusStartedAt: Date | null;
  updatedAt: Date;
  assignees: TaskAssignee[];
  tags?: TaskTag[];
  watchers?: TaskWatcher[];
};

export const DURATION_PRESETS = [15, 30, 45, 60, 90, 120] as const;

export const TASK_STATUSES: TaskStatus[] = [
  "todo",
  "in_progress",
  "blocked",
  "cancelled",
  "completed",
];

export const TASK_PRIORITIES: TaskPriority[] = [
  "low",
  "medium",
  "high",
  "urgent",
];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Not started",
  in_progress: "In progress",
  blocked: "Stuck",
  cancelled: "Cancelled",
  completed: "Done",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const TASK_RECURRENCE_LABELS: Record<TaskRecurrence, string> = {
  none: "Does not repeat",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export const TASK_RECURRENCE_OPTIONS: TaskRecurrence[] = [
  "none",
  "daily",
  "weekly",
  "monthly",
];

export type TaskDueFilter =
  | "today"
  | "upcoming"
  | "overdue"
  | "follow_up"
  | "completed"
  | "cancelled";

export type TaskSort =
  | "status"
  | "priority"
  | "due"
  | "title"
  | "created";

export const TASK_DUE_FILTERS: TaskDueFilter[] = [
  "today",
  "upcoming",
  "overdue",
  "follow_up",
  "completed",
  "cancelled",
];

export const TASK_SORTS: TaskSort[] = [
  "status",
  "priority",
  "due",
  "title",
  "created",
];

export function isTaskDueFilter(
  value: string | undefined
): value is TaskDueFilter {
  return !!value && TASK_DUE_FILTERS.includes(value as TaskDueFilter);
}

export function isTaskSort(value: string | undefined): value is TaskSort {
  return !!value && TASK_SORTS.includes(value as TaskSort);
}

export function isTaskStatus(value: string | undefined): value is TaskStatus {
  return !!value && TASK_STATUSES.includes(value as TaskStatus);
}

export function isTaskPriority(
  value: string | undefined
): value is TaskPriority {
  return !!value && TASK_PRIORITIES.includes(value as TaskPriority);
}
