import type { RowDataPacket } from "mysql2";
import { query } from "@/infrastructure/database/connection";
import { assertWorkspaceAccess } from "@/modules/workspaces/workspace.service";

export { insertActivity } from "@/modules/workspaces/workspace.repository";

export type ActivityItem = {
  id: string;
  action: string;
  actorUserId: string | null;
  actorName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

export async function listActivityForResource(input: {
  workspaceId: string;
  userId: string;
  resourceType: string;
  resourceId: string;
  limit?: number;
}) {
  await assertWorkspaceAccess({
    workspaceId: input.workspaceId,
    userId: input.userId,
    permission: "workspace.read",
  });

  const limit = Math.max(1, Math.min(input.limit ?? 50, 100));

  type Row = RowDataPacket & {
    id: string;
    action: string;
    actor_user_id: string | null;
    actor_name: string | null;
    metadata: string | Record<string, unknown> | null;
    created_at: Date;
  };

  const rows = await query<Row[]>(
    `SELECT a.id, a.action, a.actor_user_id, u.name AS actor_name, a.metadata, a.created_at
     FROM tbl_activity_logs a
     LEFT JOIN tbl_users u ON u.id = a.actor_user_id
     WHERE a.workspace_id = :workspaceId
       AND a.resource_type = :resourceType
       AND a.resource_id = :resourceId
     ORDER BY a.created_at DESC
     LIMIT ${limit}`,
    {
      workspaceId: input.workspaceId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
    }
  );

  return rows.map((r): ActivityItem => {
    let metadata: Record<string, unknown> | null = null;
    if (typeof r.metadata === "string") {
      try {
        metadata = JSON.parse(r.metadata) as Record<string, unknown>;
      } catch {
        metadata = null;
      }
    } else if (r.metadata && typeof r.metadata === "object") {
      metadata = r.metadata;
    }
    return {
      id: r.id,
      action: r.action,
      actorUserId: r.actor_user_id,
      actorName: r.actor_name,
      metadata,
      createdAt: r.created_at,
    };
  });
}
