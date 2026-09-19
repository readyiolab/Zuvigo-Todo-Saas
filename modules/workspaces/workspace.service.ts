import { createHash, randomBytes } from "node:crypto";
import { enqueueJob } from "@/infrastructure/queue/client";
import {
  cacheDel,
  cacheGet,
  cacheSet,
  userCacheKey,
  workspaceCacheKey,
} from "@/shared/cache";
import {
  authenticationError,
  authorizationError,
  conflictError,
  notFoundError,
  validationError,
} from "@/shared/errors";
import { logger } from "@/shared/logger";
import { createId } from "@/shared/utils/id";
import { slugify, uniqueSlug } from "@/shared/utils/slug";
import { getEnv } from "@/lib/env";
import {
  canDeleteWorkspace,
  canEditWorkspace,
  canManageMembers,
  roleHasPermission,
  type Permission,
  type WorkspaceRole,
} from "@/modules/workspaces/workspace.permissions";
import {
  acceptInvitation,
  createInvitation,
  findInvitationByTokenHash,
  findMembership,
  findWorkspaceById,
  findWorkspaceBySlug,
  insertActivity,
  insertWorkspaceWithOwner,
  listMembers,
  listPendingInvitations,
  listWorkspacesForUser,
  parseInvitationMetadata,
  removeMember,
  slugExists,
  softDeleteWorkspace,
  updateMemberRole,
  updateWorkspace,
} from "@/modules/workspaces/workspace.repository";
import {
  createWorkspaceSchema,
  inviteMemberSchema,
  inviteMembersBatchSchema,
  updateMemberRoleSchema,
  updateWorkspaceSchema,
} from "@/modules/workspaces/workspace.schema";
import { findUserByEmail } from "@/modules/auth/auth.repository";
import { grantPagePermissionToUser } from "@/modules/pages/page-permission.service";
import { findPageById } from "@/modules/pages/page.repository";

async function invalidateUserWorkspaces(userId: string) {
  await cacheDel(userCacheKey(userId, "workspaces"));
}

export async function getUserWorkspaces(userId: string) {
  const key = userCacheKey(userId, "workspaces");
  const cached = await cacheGet<Awaited<ReturnType<typeof listWorkspacesForUser>>>(key);
  if (cached) return cached;

  const workspaces = await listWorkspacesForUser(userId);
  await cacheSet(key, workspaces, 60);
  return workspaces;
}

export async function createWorkspace(userId: string, raw: unknown) {
  const parsed = createWorkspaceSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid workspace data", parsed.error.flatten());
  }

  let slug = slugify(parsed.data.name);
  if (await slugExists(slug)) {
    slug = uniqueSlug(parsed.data.name, createId());
  }

  const workspaceId = await insertWorkspaceWithOwner({
    name: parsed.data.name,
    slug,
    ownerUserId: userId,
    icon: parsed.data.icon,
  });

  await invalidateUserWorkspaces(userId);
  logger.info("workspace_created", { workspaceId, userId });

  const workspace = await findWorkspaceById(workspaceId);
  if (!workspace) throw notFoundError("Workspace not found");
  return { ...workspace, role: "OWNER" as const };
}

export async function assertWorkspaceAccess(params: {
  workspaceId: string;
  userId: string;
  permission?: Permission;
}) {
  const membership = await findMembership(params.workspaceId, params.userId);
  if (!membership) {
    throw authorizationError("You do not have access to this workspace");
  }

  if (
    params.permission &&
    !roleHasPermission(membership.role, params.permission)
  ) {
    throw authorizationError();
  }

  return membership;
}

export async function getWorkspaceForUserBySlug(slug: string, userId: string) {
  const workspace = await findWorkspaceBySlug(slug);
  if (!workspace) throw notFoundError("Workspace not found");

  const membership = await assertWorkspaceAccess({
    workspaceId: workspace.id,
    userId,
    permission: "workspace.read",
  });

  return { workspace, membership };
}

export async function renameWorkspace(
  workspaceId: string,
  userId: string,
  raw: unknown
) {
  const parsed = updateWorkspaceSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid workspace update", parsed.error.flatten());
  }

  const membership = await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "workspace.update",
  });

  if (!canEditWorkspace(membership.role)) {
    throw authorizationError();
  }

  await updateWorkspace(workspaceId, parsed.data);
  await cacheDel(
    userCacheKey(userId, "workspaces"),
    workspaceCacheKey(workspaceId, "details")
  );
  await insertActivity({
    workspaceId,
    actorUserId: userId,
    action: "workspace.updated",
    resourceType: "workspace",
    resourceId: workspaceId,
    metadata: parsed.data,
  });

  return findWorkspaceById(workspaceId);
}

export async function archiveWorkspace(workspaceId: string, userId: string) {
  const membership = await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "workspace.delete",
  });
  if (!canDeleteWorkspace(membership.role)) throw authorizationError();

  await softDeleteWorkspace(workspaceId);
  await invalidateUserWorkspaces(userId);
  await insertActivity({
    workspaceId,
    actorUserId: userId,
    action: "workspace.archived",
    resourceType: "workspace",
    resourceId: workspaceId,
  });
}

export async function getWorkspaceMembers(workspaceId: string, userId: string) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "members.read",
  });
  return listMembers(workspaceId);
}

export async function inviteWorkspaceMember(
  workspaceId: string,
  userId: string,
  raw: unknown
) {
  const parsed = inviteMemberSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid invitation", parsed.error.flatten());
  }

  const membership = await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "members.invite",
  });
  if (!canManageMembers(membership.role)) throw authorizationError();

  const email = parsed.data.email.toLowerCase();
  const scope = parsed.data.scope ?? "workspace";
  const pageId = parsed.data.pageId;
  const pagePermission = parsed.data.pagePermission ?? "view";

  if (scope === "page") {
    if (!pageId) throw validationError("Page is required for page-only invites");
    const page = await findPageById(pageId, workspaceId);
    if (!page) throw notFoundError("Page not found");
  }

  const existingPending = await listPendingInvitations(workspaceId);
  const already = existingPending.find((i) => i.email.toLowerCase() === email);
  if (already) {
    return {
      invitationId: already.id,
      previewToken: undefined,
      alreadyPending: true as const,
    };
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    const existingMember = await findMembership(workspaceId, existingUser.id);
    if (existingMember && existingMember.status === "active") {
      if (scope === "page" && pageId) {
        await grantPagePermissionToUser({
          workspaceId,
          pageId,
          userId: existingUser.id,
          permission: pagePermission,
        });
        return {
          invitationId: null,
          previewToken: undefined,
          alreadyMember: true as const,
          pageGranted: true as const,
        };
      }
      throw conflictError("User is already a workspace member");
    }
  }

  const role =
    scope === "page" ? ("GUEST" as const) : parsed.data.role;

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  const metadata =
    scope === "page" && pageId
      ? { pageId, pagePermission, scope: "page" as const }
      : null;

  const invitationId = await createInvitation({
    workspaceId,
    email: parsed.data.email,
    role,
    tokenHash,
    invitedBy: userId,
    expiresAt,
    metadata,
  });

  await enqueueJob(
    "invitation",
    {
      invitationId,
      email: parsed.data.email,
      workspaceId,
      token,
    },
    { jobId: `invitation:${invitationId}` }
  );

  await insertActivity({
    workspaceId,
    actorUserId: userId,
    action: "member.invited",
    resourceType: "invitation",
    resourceId: invitationId,
    metadata: {
      email: parsed.data.email,
      role,
      scope,
      pageId: pageId ?? null,
      pagePermission: scope === "page" ? pagePermission : null,
    },
  });

  return {
    invitationId,
    previewToken: getEnv().NODE_ENV === "production" ? undefined : token,
  };
}

export async function inviteWorkspaceMembersBatch(
  workspaceId: string,
  userId: string,
  raw: unknown
) {
  const parsed = inviteMembersBatchSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid invitations", parsed.error.flatten());
  }

  const results: Array<{
    email: string;
    ok: boolean;
    alreadyPending?: boolean;
    alreadyMember?: boolean;
    pageGranted?: boolean;
    error?: string;
  }> = [];

  for (const email of parsed.data.emails) {
    try {
      const data = await inviteWorkspaceMember(workspaceId, userId, {
        email,
        role: parsed.data.role,
        scope: parsed.data.scope,
        pageId: parsed.data.pageId,
        pagePermission: parsed.data.pagePermission,
      });
      results.push({
        email,
        ok: true,
        alreadyPending: Boolean(
          data && "alreadyPending" in data && data.alreadyPending
        ),
        alreadyMember: Boolean(
          data && "alreadyMember" in data && data.alreadyMember
        ),
        pageGranted: Boolean(
          data && "pageGranted" in data && data.pageGranted
        ),
      });
    } catch (error) {
      results.push({
        email,
        ok: false,
        error: error instanceof Error ? error.message : "Invite failed",
      });
    }
  }

  const sent = results.filter((r) => r.ok && !r.alreadyPending && !r.alreadyMember)
    .length;
  const pending = results.filter((r) => r.alreadyPending).length;
  const granted = results.filter((r) => r.pageGranted).length;
  const failed = results.filter((r) => !r.ok).length;

  return { results, sent, pending, granted, failed };
}

export async function acceptWorkspaceInvite(userId: string, token: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invitation = await findInvitationByTokenHash(tokenHash);
  if (!invitation || invitation.status !== "pending") {
    throw notFoundError("Invitation not found");
  }
  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    throw conflictError("Invitation has expired");
  }

  const { findUserById } = await import("@/modules/auth/auth.repository");
  const user = await findUserById(userId);
  if (!user) throw authenticationError();
  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw authorizationError(
      "This invitation was sent to a different email address"
    );
  }

  await acceptInvitation({
    invitationId: invitation.id,
    workspaceId: invitation.workspace_id,
    userId,
    role: invitation.role,
  });

  const meta = parseInvitationMetadata(invitation.metadata);
  if (meta?.pageId && meta.pagePermission) {
    await grantPagePermissionToUser({
      workspaceId: invitation.workspace_id,
      pageId: meta.pageId,
      userId,
      permission: meta.pagePermission,
    });
  }

  await invalidateUserWorkspaces(userId);
  await insertActivity({
    workspaceId: invitation.workspace_id,
    actorUserId: userId,
    action: "member.joined",
    resourceType: "workspace",
    resourceId: invitation.workspace_id,
  });

  return findWorkspaceById(invitation.workspace_id);
}

export async function changeMemberRole(
  workspaceId: string,
  userId: string,
  raw: unknown
) {
  const parsed = updateMemberRoleSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid role update", parsed.error.flatten());
  }

  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "members.update_role",
  });

  const members = await listMembers(workspaceId);
  const target = members.find((m) => m.id === parsed.data.memberId);
  if (!target) throw notFoundError("Member not found");
  if (target.role === "OWNER") {
    throw authorizationError("Cannot change the owner role");
  }

  await updateMemberRole(workspaceId, parsed.data.memberId, parsed.data.role);
  await invalidateUserWorkspaces(target.userId);
  await insertActivity({
    workspaceId,
    actorUserId: userId,
    action: "member.role_updated",
    resourceType: "member",
    resourceId: parsed.data.memberId,
    metadata: { role: parsed.data.role },
  });
}

export async function removeWorkspaceMember(
  workspaceId: string,
  userId: string,
  memberId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "members.remove",
  });

  const members = await listMembers(workspaceId);
  const target = members.find((m) => m.id === memberId);
  if (!target) throw notFoundError("Member not found");
  if (target.role === "OWNER") {
    throw authorizationError("Cannot remove the workspace owner");
  }

  await removeMember(workspaceId, memberId);
  await invalidateUserWorkspaces(target.userId);
  await insertActivity({
    workspaceId,
    actorUserId: userId,
    action: "member.removed",
    resourceType: "member",
    resourceId: memberId,
  });
}

export async function listPendingWorkspaceInvites(
  workspaceId: string,
  userId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "members.invite",
  });
  return listPendingInvitations(workspaceId);
}

export type { WorkspaceRole };
