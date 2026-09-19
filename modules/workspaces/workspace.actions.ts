"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/modules/auth/auth.service";
import {
  type ActionResult,
  failAction,
  isRedirectError,
  okAction,
} from "@/shared/actions/result";
import {
  acceptWorkspaceInvite,
  archiveWorkspace,
  changeMemberRole,
  createWorkspace,
  inviteWorkspaceMember,
  inviteWorkspaceMembersBatch,
  removeWorkspaceMember,
  renameWorkspace,
} from "@/modules/workspaces/workspace.service";

export type { ActionResult };

export async function acceptInviteAction(token: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const workspace = await acceptWorkspaceInvite(user.id, token);
    if (!workspace) {
      return failAction(new Error("Workspace not found"), "workspace_action_error");
    }
    redirect(`/w/${workspace.slug}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return failAction(error, "workspace_action_error");
  }
}

export async function createWorkspaceAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const name = String(formData.get("name") ?? "");
    const iconRaw = formData.get("icon");
    const icon = typeof iconRaw === "string" && iconRaw.trim() ? iconRaw.trim() : undefined;
    const ws = await createWorkspace(user.id, {
      name,
      icon,
    });
    redirect(`/w/${ws.slug}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return failAction(error, "workspace_action_error");
  }
}

export async function updateWorkspaceAction(
  workspaceId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await renameWorkspace(workspaceId, user.id, {
      name: String(formData.get("name") ?? ""),
    });
    return okAction();
  } catch (error) {
    return failAction(error, "workspace_action_error");
  }
}

export async function archiveWorkspaceAction(workspaceId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await archiveWorkspace(workspaceId, user.id);
    redirect("/w/new");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return failAction(error, "workspace_action_error");
  }
}

export async function inviteMemberAction(
  workspaceId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = await inviteWorkspaceMember(workspaceId, user.id, {
      email: String(formData.get("email") ?? ""),
      role: String(formData.get("role") ?? "MEMBER"),
    });
    return okAction(data);
  } catch (error) {
    return failAction(error, "workspace_action_error");
  }
}

export async function inviteMembersBatchAction(input: {
  workspaceId: string;
  emails: string[];
  role: "ADMIN" | "MEMBER" | "GUEST";
  scope: "workspace" | "page";
  pageId?: string;
  pagePermission?: "view" | "comment" | "edit" | "full";
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = await inviteWorkspaceMembersBatch(input.workspaceId, user.id, {
      emails: input.emails,
      role: input.role,
      scope: input.scope,
      pageId: input.pageId,
      pagePermission: input.pagePermission,
    });
    return okAction(data);
  } catch (error) {
    return failAction(error, "workspace_action_error");
  }
}

export async function updateMemberRoleAction(
  workspaceId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await changeMemberRole(workspaceId, user.id, {
      memberId: String(formData.get("memberId") ?? ""),
      role: String(formData.get("role") ?? "MEMBER"),
    });
    return okAction();
  } catch (error) {
    return failAction(error, "workspace_action_error");
  }
}

export async function removeMemberAction(
  workspaceId: string,
  memberId: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await removeWorkspaceMember(workspaceId, user.id, memberId);
    return okAction();
  } catch (error) {
    return failAction(error, "workspace_action_error");
  }
}
