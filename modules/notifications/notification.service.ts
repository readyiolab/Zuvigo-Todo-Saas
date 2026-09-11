import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/infrastructure/database/connection";
import { assertWorkspaceAccess } from "@/modules/workspaces/workspace.service";
import { createId } from "@/shared/utils/id";
import {
  getNotificationPrefs,
  type NotificationPrefs,
} from "@/modules/productivity/plan.repository";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  resourceType: string | null;
  resourceId: string | null;
  isRead: boolean;
  createdAt: Date;
};

function prefAllows(type: string, prefs: NotificationPrefs): boolean {
  if (type === "task.assigned") return prefs.assignment;
  if (type === "task.due_soon" || type === "task.reminder") {
    return prefs.upcomingDeadline;
  }
  if (type === "task.overdue") return prefs.overdue;
  if (type === "daily.plan" || type === "plan.reminder") return prefs.dailyPlan;
  if (type === "task.recurring") return prefs.recurring;
  return true;
}

export async function insertNotification(input: {
  workspaceId: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
}) {
  try {
    const prefs = await getNotificationPrefs({
      workspaceId: input.workspaceId,
      userId: input.userId,
    });
    if (!prefAllows(input.type, prefs)) return;
  } catch {
    /* prefs table may be missing before migration — still notify */
  }

  await execute(
    `INSERT INTO tbl_notifications
      (id, workspace_id, user_id, type, title, body, resource_type, resource_id)
     VALUES
      (:id, :workspaceId, :userId, :type, :title, :body, :resourceType, :resourceId)`,
    {
      id: createId(),
      workspaceId: input.workspaceId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
    }
  );
}

export async function listNotificationsForUser(
  userId: string,
  workspaceId: string,
  options: { unreadOnly?: boolean } = {}
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "workspace.read",
  });

  type Row = RowDataPacket & {
    id: string;
    type: string;
    title: string;
    body: string | null;
    resource_type: string | null;
    resource_id: string | null;
    is_read: number;
    created_at: Date;
  };

  const rows = await query<Row[]>(
    `SELECT id, type, title, body, resource_type, resource_id, is_read, created_at
     FROM tbl_notifications
     WHERE user_id = :userId
       AND (workspace_id = :workspaceId OR workspace_id IS NULL)
       ${options.unreadOnly ? "AND is_read = 0" : ""}
     ORDER BY created_at DESC
     LIMIT 100`,
    { userId, workspaceId }
  );

  return rows.map(
    (r): NotificationItem => ({
      id: r.id,
      type: r.type,
      title: r.title,
      body: r.body,
      resourceType: r.resource_type,
      resourceId: r.resource_id,
      isRead: Boolean(r.is_read),
      createdAt: r.created_at,
    })
  );
}

export async function getUnreadCount(userId: string, workspaceId: string) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "workspace.read",
  });

  type Row = RowDataPacket & { total: number };
  const rows = await query<Row[]>(
    `SELECT COUNT(*) AS total
     FROM tbl_notifications
     WHERE user_id = :userId
       AND is_read = 0
       AND (workspace_id = :workspaceId OR workspace_id IS NULL)`,
    { userId, workspaceId }
  );
  return Number(rows[0]?.total ?? 0);
}

export async function markNotificationRead(
  userId: string,
  notificationId: string
) {
  await execute(
    `UPDATE tbl_notifications
     SET is_read = 1, read_at = NOW()
     WHERE id = :notificationId AND user_id = :userId`,
    { notificationId, userId }
  );
}

export async function markAllNotificationsRead(
  userId: string,
  workspaceId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "workspace.read",
  });

  await execute(
    `UPDATE tbl_notifications
     SET is_read = 1, read_at = NOW()
     WHERE user_id = :userId
       AND is_read = 0
       AND (workspace_id = :workspaceId OR workspace_id IS NULL)`,
    { userId, workspaceId }
  );
}
