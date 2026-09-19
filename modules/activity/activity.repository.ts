import type { RowDataPacket } from "mysql2";
import { query } from "@/infrastructure/database/connection";

export type ActivityLogRow = RowDataPacket & {
  id: string;
  action: string;
  actor_user_id: string | null;
  actor_name: string | null;
  metadata: string | Record<string, unknown> | null;
  created_at: Date;
};

export async function findActivityByResource(
  workspaceId: string,
  resourceType: string,
  resourceId: string,
  limit: number
): Promise<ActivityLogRow[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  return query<ActivityLogRow[]>(
    `SELECT a.id, a.action, a.actor_user_id, u.name AS actor_name, a.metadata, a.created_at
     FROM tbl_activity_logs a
     LEFT JOIN tbl_users u ON u.id = a.actor_user_id
     WHERE a.workspace_id = :workspaceId
       AND a.resource_type = :resourceType
       AND a.resource_id = :resourceId
     ORDER BY a.created_at DESC
     LIMIT ${safeLimit}`,
    {
      workspaceId,
      resourceType,
      resourceId,
    }
  );
}
