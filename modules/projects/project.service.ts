import { assertWorkspaceAccess } from "@/modules/workspaces/workspace.service";
import { notFoundError, validationError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { insertActivity } from "@/modules/workspaces/workspace.repository";
import {
  createProjectSchema,
  updateProjectSchema,
} from "@/modules/projects/project.schema";
import type { ProjectRecord } from "@/modules/projects/project.types";
import {
  createProjectRecord,
  findProjectById,
  getMaxProjectSortOrder,
  listProjectsByWorkspace,
  nextSortAfter,
  softDeleteProject,
  updateProjectRecord,
} from "@/modules/projects/project.repository";

export type { ProjectRecord };

export async function listProjects(workspaceId: string, userId: string) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "projects.read",
  });
  return listProjectsByWorkspace(workspaceId);
}

export async function getProject(
  workspaceId: string,
  projectId: string,
  userId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "projects.read",
  });
  const project = await findProjectById(projectId, workspaceId);
  if (!project) throw notFoundError("Project not found");
  return project;
}

export async function createProject(userId: string, raw: unknown) {
  const parsed = createProjectSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid project data", parsed.error.flatten());
  }

  await assertWorkspaceAccess({
    workspaceId: parsed.data.workspaceId,
    userId,
    permission: "projects.create",
  });

  const last = await getMaxProjectSortOrder(parsed.data.workspaceId);
  const projectId = await createProjectRecord({
    workspaceId: parsed.data.workspaceId,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    status: parsed.data.status,
    startDate: parsed.data.startDate ?? null,
    dueDate: parsed.data.dueDate ?? null,
    createdBy: userId,
    sortOrder: nextSortAfter(last),
  });

  logger.info("project_created", { projectId, userId });
  const project = await findProjectById(projectId, parsed.data.workspaceId);
  if (!project) throw notFoundError("Project not found");
  return project;
}

export async function updateProject(
  workspaceId: string,
  projectId: string,
  userId: string,
  raw: unknown
) {
  const parsed = updateProjectSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid project update", parsed.error.flatten());
  }

  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "projects.update",
  });

  const existing = await findProjectById(projectId, workspaceId);
  if (!existing) throw notFoundError("Project not found");

  await updateProjectRecord(projectId, workspaceId, parsed.data);
  await insertActivity({
    workspaceId,
    actorUserId: userId,
    action: "project.updated",
    resourceType: "project",
    resourceId: projectId,
    metadata: parsed.data as Record<string, unknown>,
  });

  return findProjectById(projectId, workspaceId);
}

export async function deleteProject(
  workspaceId: string,
  projectId: string,
  userId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "projects.delete",
  });

  const existing = await findProjectById(projectId, workspaceId);
  if (!existing) throw notFoundError("Project not found");

  await softDeleteProject(projectId, workspaceId);
  await insertActivity({
    workspaceId,
    actorUserId: userId,
    action: "project.archived",
    resourceType: "project",
    resourceId: projectId,
    metadata: { name: existing.name },
  });
  logger.info("project_deleted", { projectId, userId });
}
