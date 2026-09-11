import { z } from "zod";

export const createPageSchema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().trim().max(255).optional().default("Untitled"),
  parentId: z.string().nullable().optional(),
  icon: z.string().trim().max(64).nullable().optional(),
});

export const updatePageSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  icon: z.string().trim().max(64).nullable().optional(),
  isArchived: z.boolean().optional(),
});

export const movePageSchema = z.object({
  workspaceId: z.string().min(1),
  pageId: z.string().min(1),
  parentId: z.string().nullable(),
  sortOrder: z.string().min(1).max(64),
});

export const saveBlocksSchema = z.object({
  workspaceId: z.string().min(1),
  pageId: z.string().min(1),
  blocks: z.array(
    z.object({
      id: z.string().optional(),
      type: z.string().min(1).max(64),
      content: z.record(z.string(), z.unknown()),
      sortOrder: z.string().min(1).max(64),
      parentBlockId: z.string().nullable().optional(),
    })
  ),
});
