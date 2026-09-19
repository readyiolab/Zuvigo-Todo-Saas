import { authorizationError, notFoundError } from "@/shared/errors";
import type { PagePermissionLevel } from "@/lib/invite-permission";
import {
  findUserPagePermission,
  listPageIdsForUser,
  pagePermissionAtLeast,
  upsertPagePermission,
} from "@/modules/pages/page-permission.repository";
import { findPageById } from "@/modules/pages/page.repository";
import type { WorkspaceRole } from "@/modules/workspaces/workspace.permissions";

export async function grantPagePermissionToUser(input: {
  workspaceId: string;
  pageId: string;
  userId: string;
  permission: PagePermissionLevel;
}) {
  const page = await findPageById(input.pageId, input.workspaceId);
  if (!page) throw notFoundError("Page not found");

  await upsertPagePermission({
    workspaceId: input.workspaceId,
    pageId: input.pageId,
    subjectType: "user",
    subjectId: input.userId,
    permission: input.permission,
  });
}

export async function assertGuestPageAccess(input: {
  workspaceId: string;
  pageId: string;
  userId: string;
  role: WorkspaceRole;
  required: PagePermissionLevel;
}) {
  if (input.role !== "GUEST") return;

  const grant = await findUserPagePermission(input.pageId, input.userId);
  if (!grant || !pagePermissionAtLeast(grant.permission, input.required)) {
    throw authorizationError("You do not have access to this page");
  }
}

export async function filterPagesForGuest<T extends { id: string }>(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
  pages: T[]
): Promise<T[]> {
  if (role !== "GUEST") return pages;
  const allowed = new Set(await listPageIdsForUser(workspaceId, userId));
  return pages.filter((p) => allowed.has(p.id));
}
