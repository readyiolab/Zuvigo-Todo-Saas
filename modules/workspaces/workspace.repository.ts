import {
  execute,
  query,
  withTransaction,
  type PoolConnection,
  type RowDataPacket,
} from "@/infrastructure/database/connection";
import {
  mapWorkspace,
  type WorkspaceRow,
  type WorkspaceWithRole,
} from "@/modules/workspaces/workspace.types";
import type { WorkspaceRole } from "@/modules/workspaces/workspace.permissions";
import { createId } from "@/shared/utils/id";

export async function insertWorkspaceWithOwner(input: {
  name: string;
  slug: string;
  ownerUserId: string;
  icon?: string | null;
}) {
  const workspaceId = createId();
  const memberId = createId();

  await withTransaction(async (conn) => {
    await conn.execute(
      `INSERT INTO tbl_workspaces (id, name, slug, owner_user_id, icon, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [workspaceId, input.name, input.slug, input.ownerUserId, input.icon ?? null]
    );

    await conn.execute(
      `INSERT INTO tbl_workspace_members
        (id, workspace_id, user_id, role, status, joined_at)
       VALUES (?, ?, ?, 'OWNER', 'active', CURRENT_TIMESTAMP(3))`,
      [memberId, workspaceId, input.ownerUserId]
    );

    await conn.execute(
      `INSERT INTO tbl_activity_logs
        (id, workspace_id, actor_user_id, action, resource_type, resource_id, metadata)
       VALUES (?, ?, ?, 'workspace.created', 'workspace', ?, ?)`,
      [
        createId(),
        workspaceId,
        input.ownerUserId,
        workspaceId,
        JSON.stringify({ name: input.name }),
      ]
    );

    await conn.execute(
      `INSERT INTO tbl_subscriptions (id, workspace_id, plan, status)
       VALUES (?, ?, 'free', 'active')`,
      [createId(), workspaceId]
    );
  });

  return workspaceId;
}

export async function listWorkspacesForUser(userId: string): Promise<WorkspaceWithRole[]> {
  const rows = await query<WorkspaceRow[]>(
    `SELECT w.*, m.role
     FROM tbl_workspaces w
     INNER JOIN tbl_workspace_members m
       ON m.workspace_id = w.id AND m.user_id = :userId
     WHERE w.deleted_at IS NULL
       AND m.deleted_at IS NULL
       AND m.status = 'active'
       AND w.status = 'active'
     ORDER BY w.name ASC`,
    { userId }
  );

  return rows.map((row) => ({
    ...mapWorkspace(row),
    role: row.role as WorkspaceRole,
  }));
}

export async function findWorkspaceBySlug(slug: string) {
  const rows = await query<WorkspaceRow[]>(
    `SELECT * FROM tbl_workspaces WHERE slug = :slug AND deleted_at IS NULL LIMIT 1`,
    { slug }
  );
  return rows[0] ? mapWorkspace(rows[0]) : null;
}

export async function findWorkspaceById(id: string) {
  const rows = await query<WorkspaceRow[]>(
    `SELECT * FROM tbl_workspaces WHERE id = :id AND deleted_at IS NULL LIMIT 1`,
    { id }
  );
  return rows[0] ? mapWorkspace(rows[0]) : null;
}

export async function findMembership(workspaceId: string, userId: string) {
  type MemberRow = RowDataPacket & {
    id: string;
    workspace_id: string;
    user_id: string;
    role: WorkspaceRole;
    status: "active" | "invited" | "removed";
    joined_at: Date | null;
  };

  const rows = await query<MemberRow[]>(
    `SELECT * FROM tbl_workspace_members
     WHERE workspace_id = :workspaceId
       AND user_id = :userId
       AND deleted_at IS NULL
       AND status = 'active'
     LIMIT 1`,
    { workspaceId, userId }
  );

  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at,
  };
}

export async function updateWorkspace(
  workspaceId: string,
  data: { name?: string; icon?: string | null; status?: "active" | "archived" }
) {
  const sets: string[] = [];
  const params: Record<string, unknown> = { workspaceId };

  if (data.name !== undefined) {
    sets.push("name = :name");
    params.name = data.name;
  }
  if (data.icon !== undefined) {
    sets.push("icon = :icon");
    params.icon = data.icon;
  }
  if (data.status !== undefined) {
    sets.push("status = :status");
    params.status = data.status;
  }

  if (sets.length === 0) return;

  await execute(
    `UPDATE tbl_workspaces SET ${sets.join(", ")} WHERE id = :workspaceId AND deleted_at IS NULL`,
    params
  );
}

export async function softDeleteWorkspace(workspaceId: string) {
  await execute(
    `UPDATE tbl_workspaces
     SET deleted_at = CURRENT_TIMESTAMP(3), status = 'archived'
     WHERE id = :workspaceId AND deleted_at IS NULL`,
    { workspaceId }
  );
}

export async function listMembers(workspaceId: string) {
  type Row = RowDataPacket & {
    id: string;
    user_id: string;
    role: WorkspaceRole;
    status: string;
    joined_at: Date | null;
    email: string;
    name: string;
    avatar_url: string | null;
  };

  const rows = await query<Row[]>(
    `SELECT m.id, m.user_id, m.role, m.status, m.joined_at,
            u.email, u.name, u.avatar_url
     FROM tbl_workspace_members m
     INNER JOIN tbl_users u ON u.id = m.user_id AND u.deleted_at IS NULL
     WHERE m.workspace_id = :workspaceId
       AND m.deleted_at IS NULL
       AND m.status = 'active'
     ORDER BY FIELD(m.role, 'OWNER', 'ADMIN', 'MEMBER', 'GUEST'), u.name ASC`,
    { workspaceId }
  );

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    role: r.role,
    status: r.status,
    joinedAt: r.joined_at,
    email: r.email,
    name: r.name,
    avatarUrl: r.avatar_url,
  }));
}

export async function createInvitation(input: {
  workspaceId: string;
  email: string;
  role: "ADMIN" | "MEMBER" | "GUEST";
  tokenHash: string;
  invitedBy: string;
  expiresAt: Date;
}) {
  const existing = await query<RowDataPacket[]>(
    `SELECT id FROM tbl_workspace_invitations
     WHERE workspace_id = :workspaceId
       AND email = :email
       AND status = 'pending'
       AND expires_at > CURRENT_TIMESTAMP(3)
     LIMIT 1`,
    { workspaceId: input.workspaceId, email: input.email.toLowerCase() }
  );
  if (existing[0]) {
    return existing[0].id as string;
  }

  const id = createId();
  await execute(
    `INSERT INTO tbl_workspace_invitations
      (id, workspace_id, email, role, token_hash, status, invited_by, expires_at)
     VALUES (:id, :workspaceId, :email, :role, :tokenHash, 'pending', :invitedBy, :expiresAt)`,
    {
      id,
      workspaceId: input.workspaceId,
      email: input.email.toLowerCase(),
      role: input.role,
      tokenHash: input.tokenHash,
      invitedBy: input.invitedBy,
      expiresAt: input.expiresAt,
    }
  );
  return id;
}

export async function listPendingInvitations(workspaceId: string) {
  type Row = RowDataPacket & {
    id: string;
    email: string;
    role: string;
    expires_at: Date;
    created_at: Date;
  };
  const rows = await query<Row[]>(
    `SELECT id, email, role, expires_at, created_at
     FROM tbl_workspace_invitations
     WHERE workspace_id = :workspaceId
       AND status = 'pending'
       AND expires_at > CURRENT_TIMESTAMP(3)
     ORDER BY created_at DESC
     LIMIT 50`,
    { workspaceId }
  );
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
  }));
}

export async function findInvitationByTokenHash(tokenHash: string) {
  type Row = RowDataPacket & {
    id: string;
    workspace_id: string;
    email: string;
    role: "ADMIN" | "MEMBER" | "GUEST";
    status: string;
    expires_at: Date;
  };
  const rows = await query<Row[]>(
    `SELECT * FROM tbl_workspace_invitations WHERE token_hash = :tokenHash LIMIT 1`,
    { tokenHash }
  );
  return rows[0] ?? null;
}

export async function acceptInvitation(input: {
  invitationId: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  conn?: PoolConnection;
}) {
  const memberId = createId();
  const run = async (conn: PoolConnection) => {
    await conn.execute(
      `UPDATE tbl_workspace_invitations
       SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?`,
      [input.invitationId]
    );
    await conn.execute(
      `INSERT INTO tbl_workspace_members
        (id, workspace_id, user_id, role, status, joined_at)
       VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP(3))
       ON DUPLICATE KEY UPDATE
         role = VALUES(role),
         status = 'active',
         deleted_at = NULL,
         joined_at = CURRENT_TIMESTAMP(3)`,
      [memberId, input.workspaceId, input.userId, input.role]
    );
  };

  if (input.conn) {
    await run(input.conn);
  } else {
    await withTransaction(run);
  }

  return memberId;
}

export async function updateMemberRole(
  workspaceId: string,
  memberId: string,
  role: WorkspaceRole
) {
  await execute(
    `UPDATE tbl_workspace_members
     SET role = :role
     WHERE id = :memberId AND workspace_id = :workspaceId AND deleted_at IS NULL`,
    { role, memberId, workspaceId }
  );
}

export async function removeMember(workspaceId: string, memberId: string) {
  await execute(
    `UPDATE tbl_workspace_members
     SET status = 'removed', deleted_at = CURRENT_TIMESTAMP(3)
     WHERE id = :memberId AND workspace_id = :workspaceId AND deleted_at IS NULL`,
    { memberId, workspaceId }
  );
}

export async function insertActivity(input: {
  workspaceId: string | null;
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await execute(
    `INSERT INTO tbl_activity_logs
      (id, workspace_id, actor_user_id, action, resource_type, resource_id, metadata)
     VALUES (:id, :workspaceId, :actorUserId, :action, :resourceType, :resourceId, :metadata)`,
    {
      id: createId(),
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    }
  );
}

export async function slugExists(slug: string) {
  const rows = await query<RowDataPacket[]>(
    `SELECT id FROM tbl_workspaces WHERE slug = :slug LIMIT 1`,
    { slug }
  );
  return rows.length > 0;
}
