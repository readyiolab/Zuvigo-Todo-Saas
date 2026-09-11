import {
  roleHasPermission,
  type WorkspaceRole,
} from "../modules/workspaces/workspace.permissions";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const roles: WorkspaceRole[] = ["OWNER", "ADMIN", "MEMBER", "GUEST"];

assert(roleHasPermission("OWNER", "workspace.delete"), "owner can delete");
assert(!roleHasPermission("ADMIN", "workspace.delete"), "admin cannot delete");
assert(!roleHasPermission("GUEST", "pages.create"), "guest cannot create pages");
assert(roleHasPermission("MEMBER", "tasks.update"), "member can update tasks");
assert(roleHasPermission("MEMBER", "tasks.create"), "member can create tasks");
assert(roleHasPermission("MEMBER", "tasks.delete"), "member can delete tasks");
assert(!roleHasPermission("MEMBER", "projects.delete"), "member cannot delete projects");
assert(roleHasPermission("ADMIN", "projects.delete"), "admin can delete projects");
assert(roleHasPermission("GUEST", "tasks.read"), "guest can read tasks");
assert(!roleHasPermission("GUEST", "tasks.update"), "guest cannot update tasks");
assert(roleHasPermission("MEMBER", "projects.update"), "member can update projects");
assert(roles.length === 4, "four roles");

console.log("permission checks passed");
