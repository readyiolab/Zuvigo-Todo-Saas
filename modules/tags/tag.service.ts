import { z } from "zod";
import {
  deleteTagById,
  findTagsByWorkspaceId,
  insertTag,
} from "@/modules/tags/tag.repository";
import { assertWorkspaceAccess } from "@/modules/workspaces/workspace.service";
import { createId } from "@/shared/utils/id";
import { conflictError, validationError } from "@/shared/errors";

export type TagRecord = {
  id: string;
  workspaceId: string;
  name: string;
  color: string | null;
};

const createTagSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().trim().min(1).max(64),
  color: z.string().trim().max(32).nullable().optional(),
});

export async function listWorkspaceTags(workspaceId: string, userId: string) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "tasks.read",
  });
  const rows = await findTagsByWorkspaceId(workspaceId);
  return rows.map(
    (r): TagRecord => ({
      id: r.id,
      workspaceId: r.workspace_id,
      name: r.name,
      color: r.color,
    })
  );
}

export async function createWorkspaceTag(userId: string, raw: unknown) {
  const parsed = createTagSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid tag", parsed.error.flatten());
  }
  await assertWorkspaceAccess({
    workspaceId: parsed.data.workspaceId,
    userId,
    permission: "tasks.update",
  });
  const id = createId();
  try {
    await insertTag({
      id,
      workspaceId: parsed.data.workspaceId,
      name: parsed.data.name,
      color: parsed.data.color ?? null,
    });
  } catch {
    throw conflictError("A tag with this name already exists");
  }
  return {
    id,
    workspaceId: parsed.data.workspaceId,
    name: parsed.data.name,
    color: parsed.data.color ?? null,
  } satisfies TagRecord;
}

export async function deleteWorkspaceTag(
  workspaceId: string,
  tagId: string,
  userId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "tasks.update",
  });
  await deleteTagById(workspaceId, tagId);
}

