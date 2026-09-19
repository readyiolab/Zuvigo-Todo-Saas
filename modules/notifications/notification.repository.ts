import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/infrastructure/database/connection";

export type NotificationRow = RowDataPacket & {
  id: string;
  type: string;
  title: string;
  body: string | null;
  resource_type: string | null;
  resource_id: string | null;
  is_read: number;
  created_at: Date;
};

export async function insertNotificationRecord(record: {
  id: string;
  workspaceId: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  resourceType: string | null;
  resourceId: string | null;
}): Promise<void> {
  await execute(
    `INSERT INTO tbl_notifications
      (id, workspace_id, user_id, type, title, body, resource_type, resource_id)
     VALUES
      (:id, :workspaceId, :userId, :type, :title, :body, :resourceType, :resourceId)`,
    record
  );
}

export async function findNotificationsByUser(
  userId: string,
  workspaceId: string,
  options: { unreadOnly?: boolean } = {}
): Promise<NotificationRow[]> {
  return query<NotificationRow[]>(
    `SELECT id, type, title, body, resource_type, resource_id, is_read, created_at
     FROM tbl_notifications
     WHERE user_id = :userId
       AND (workspace_id = :workspaceId OR workspace_id IS NULL)
       ${options.unreadOnly ? "AND is_read = 0" : ""}
     ORDER BY created_at DESC
     LIMIT 100`,
    { userId, workspaceId }
  );
}

export async function countUnreadNotifications(
  userId: string,
  workspaceId: string
): Promise<number> {
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

export async function updateNotificationRead(
  userId: string,
  notificationId: string
): Promise<void> {
  await execute(
    `UPDATE tbl_notifications
     SET is_read = 1, read_at = NOW()
     WHERE id = :notificationId AND user_id = :userId`,
    { notificationId, userId }
  );
}

export async function updateAllNotificationsRead(
  userId: string,
  workspaceId: string
): Promise<void> {
  await execute(
    `UPDATE tbl_notifications
     SET is_read = 1, read_at = NOW()
     WHERE user_id = :userId
       AND is_read = 0
       AND (workspace_id = :workspaceId OR workspace_id IS NULL)`,
    { userId, workspaceId }
  );
}
