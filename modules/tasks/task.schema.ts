import { z } from "zod";

export const taskStatusSchema = z.enum([
  "todo",
  "in_progress",
  "blocked",
  "cancelled",
  "completed",
]);

export const taskPrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "urgent",
]);

export const taskRecurrenceSchema = z.enum([
  "none",
  "daily",
  "weekly",
  "monthly",
]);

const optionalDateTime = z
  .string()
  .nullable()
  .optional()
  .refine(
    (v) => v == null || v === "" || !Number.isNaN(Date.parse(v)),
    "Invalid date"
  );

export const createTaskSchema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(10000).nullable().optional(),
  projectId: z.string().nullable().optional(),
  parentTaskId: z.string().nullable().optional(),
  status: taskStatusSchema.optional().default("todo"),
  priority: taskPrioritySchema.optional().default("medium"),
  icon: z.string().trim().max(512).nullable().optional(),
  color: z.string().trim().max(32).nullable().optional(),
  startAt: optionalDateTime,
  dueAt: optionalDateTime,
  followUpAt: optionalDateTime,
  remindAt: optionalDateTime,
  recurrenceRule: taskRecurrenceSchema.nullable().optional(),
  estimatedDurationMinutes: z.number().int().min(1).max(24 * 60).nullable().optional(),
  assigneeIds: z.array(z.string().min(1)).optional().default([]),
  tagIds: z.array(z.string().min(1)).optional().default([]),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(10000).nullable().optional(),
  projectId: z.string().nullable().optional(),
  parentTaskId: z.string().nullable().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  icon: z.string().trim().max(512).nullable().optional(),
  color: z.string().trim().max(32).nullable().optional(),
  startAt: optionalDateTime,
  dueAt: optionalDateTime,
  followUpAt: optionalDateTime,
  remindAt: optionalDateTime,
  recurrenceRule: taskRecurrenceSchema.nullable().optional(),
  estimatedDurationMinutes: z.number().int().min(1).max(24 * 60).nullable().optional(),
  actualDurationMinutes: z.number().int().min(0).max(7 * 24 * 60).nullable().optional(),
  focusStartedAt: optionalDateTime,
});

export const moveTaskSchema = z.object({
  workspaceId: z.string().min(1),
  taskId: z.string().min(1),
  status: taskStatusSchema,
  sortOrder: z.string().min(1).max(64),
});

export const setAssigneesSchema = z.object({
  workspaceId: z.string().min(1),
  taskId: z.string().min(1),
  assigneeIds: z.array(z.string().min(1)),
});

export const setWatchersSchema = z.object({
  workspaceId: z.string().min(1),
  taskId: z.string().min(1),
  watcherIds: z.array(z.string().min(1)),
});

export const setTaskTagsSchema = z.object({
  workspaceId: z.string().min(1),
  taskId: z.string().min(1),
  tagIds: z.array(z.string().min(1)),
});
