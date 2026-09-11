"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/modules/auth/auth.service";
import {
  type ActionResult,
  failAction,
  isRedirectError,
  okAction,
} from "@/shared/actions/result";
import {
  createProject,
  deleteProject,
  updateProject,
} from "@/modules/projects/project.service";

export type { ActionResult };

export async function createProjectAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  name: string;
  description?: string | null;
  status?: string;
  startDate?: string | null;
  dueDate?: string | null;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const project = await createProject(user.id, {
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description,
      status: input.status,
      startDate: input.startDate,
      dueDate: input.dueDate,
    });
    revalidatePath(`/w/${input.workspaceSlug}/projects`);
    revalidatePath(`/w/${input.workspaceSlug}`);
    redirect(`/w/${input.workspaceSlug}/projects/${project.id}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return failAction(error, "project_action_error");
  }
}

export async function updateProjectAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  projectId: string;
  name?: string;
  description?: string | null;
  status?: string;
  startDate?: string | null;
  dueDate?: string | null;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await updateProject(input.workspaceId, input.projectId, user.id, {
      name: input.name,
      description: input.description,
      status: input.status,
      startDate: input.startDate,
      dueDate: input.dueDate,
    });
    revalidatePath(`/w/${input.workspaceSlug}/projects`);
    revalidatePath(`/w/${input.workspaceSlug}/projects/${input.projectId}`);
    return okAction();
  } catch (error) {
    return failAction(error, "project_action_error");
  }
}

export async function deleteProjectAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  projectId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await deleteProject(input.workspaceId, input.projectId, user.id);
    revalidatePath(`/w/${input.workspaceSlug}/projects`);
    revalidatePath(`/w/${input.workspaceSlug}`);
    redirect(`/w/${input.workspaceSlug}/projects`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return failAction(error, "project_action_error");
  }
}
