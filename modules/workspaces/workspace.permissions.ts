export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "GUEST";

export type Permission =
  | "workspace.read"
  | "workspace.update"
  | "workspace.delete"
  | "members.read"
  | "members.invite"
  | "members.remove"
  | "members.update_role"
  | "pages.create"
  | "pages.read"
  | "pages.update"
  | "pages.delete"
  | "projects.create"
  | "projects.read"
  | "projects.update"
  | "projects.delete"
  | "tasks.create"
  | "tasks.read"
  | "tasks.update"
  | "tasks.delete"
  | "files.upload"
  | "billing.manage";

const ROLE_PERMISSIONS: Record<WorkspaceRole, readonly Permission[]> = {
  OWNER: [
    "workspace.read",
    "workspace.update",
    "workspace.delete",
    "members.read",
    "members.invite",
    "members.remove",
    "members.update_role",
    "pages.create",
    "pages.read",
    "pages.update",
    "pages.delete",
    "projects.create",
    "projects.read",
    "projects.update",
    "projects.delete",
    "tasks.create",
    "tasks.read",
    "tasks.update",
    "tasks.delete",
    "files.upload",
    "billing.manage",
  ],
  ADMIN: [
    "workspace.read",
    "workspace.update",
    "members.read",
    "members.invite",
    "members.remove",
    "members.update_role",
    "pages.create",
    "pages.read",
    "pages.update",
    "pages.delete",
    "projects.create",
    "projects.read",
    "projects.update",
    "projects.delete",
    "tasks.create",
    "tasks.read",
    "tasks.update",
    "tasks.delete",
    "files.upload",
  ],
  MEMBER: [
    "workspace.read",
    "members.read",
    "pages.create",
    "pages.read",
    "pages.update",
    "projects.create",
    "projects.read",
    "projects.update",
    "tasks.create",
    "tasks.read",
    "tasks.update",
    "tasks.delete",
    "files.upload",
  ],
  GUEST: [
    "workspace.read",
    "pages.read",
    "projects.read",
    "tasks.read",
  ],
};

export function roleHasPermission(role: WorkspaceRole, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canViewWorkspace(role: WorkspaceRole) {
  return roleHasPermission(role, "workspace.read");
}

export function canEditWorkspace(role: WorkspaceRole) {
  return roleHasPermission(role, "workspace.update");
}

export function canDeleteWorkspace(role: WorkspaceRole) {
  return roleHasPermission(role, "workspace.delete");
}

export function canManageMembers(role: WorkspaceRole) {
  return roleHasPermission(role, "members.invite");
}

export function canUploadFiles(role: WorkspaceRole) {
  return roleHasPermission(role, "files.upload");
}
