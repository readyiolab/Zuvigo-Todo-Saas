import type { RowDataPacket } from "mysql2";
import type { WorkspaceRole } from "@/modules/workspaces/workspace.permissions";

export type WorkspaceStatus = "active" | "archived";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  ownerUserId: string;
  icon: string | null;
  status: WorkspaceStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  status: "active" | "invited" | "removed";
  joinedAt: Date | null;
};

export type WorkspaceWithRole = Workspace & { role: WorkspaceRole };

export type WorkspaceRow = RowDataPacket & {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
  icon: string | null;
  status: WorkspaceStatus;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  role?: WorkspaceRole;
};

export function mapWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    ownerUserId: row.owner_user_id,
    icon: row.icon,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
