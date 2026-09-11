import { z } from "zod";

export const projectStatusSchema = z.enum([
  "planned",
  "active",
  "on_hold",
  "completed",
  "archived",
]);

export const createProjectSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().trim().min(1).max(180),
  description: z.string().trim().max(5000).nullable().optional(),
  status: projectStatusSchema.optional().default("planned"),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(180).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  status: projectStatusSchema.optional(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});
