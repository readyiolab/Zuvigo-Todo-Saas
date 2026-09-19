import {
  findActivityByResource,
  type ActivityLogRow,
} from "@/modules/activity/activity.repository";
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

  const rows = await findActivityByResource(
    input.workspaceId,
    input.resourceType,
    input.resourceId,
    input.limit ?? 50
  );

  return rows.map((r: ActivityLogRow): ActivityItem => {
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
