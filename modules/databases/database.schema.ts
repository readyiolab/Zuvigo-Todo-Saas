import { z } from "zod";

export const createDatabaseSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().trim().min(1).max(180),
  description: z.string().trim().max(2000).nullable().optional(),
});

export const createRowSchema = z.object({
  workspaceId: z.string().min(1),
  databaseId: z.string().min(1),
});

export const updateCellSchema = z.object({
  workspaceId: z.string().min(1),
  databaseId: z.string().min(1),
  rowId: z.string().min(1),
  propertyId: z.string().min(1),
  value: z.unknown(),
});

export const deleteRowSchema = z.object({
  workspaceId: z.string().min(1),
  databaseId: z.string().min(1),
  rowId: z.string().min(1),
});
