import {
  countUnreadNotifications,
  findNotificationsByUser,
  insertNotificationRecord,
  updateAllNotificationsRead,
  updateNotificationRead,
} from "@/modules/notifications/notification.repository";
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
  if (type === "task.assigned" || type === "comment.mention") {
    return prefs.assignment;
  }
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

  await insertNotificationRecord({
    id: createId(),
    workspaceId: input.workspaceId,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    resourceType: input.resourceType ?? null,
    resourceId: input.resourceId ?? null,
  });
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

  const rows = await findNotificationsByUser(userId, workspaceId, options);

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

  return countUnreadNotifications(userId, workspaceId);
}

export async function markNotificationRead(
  userId: string,
  notificationId: string
) {
  await updateNotificationRead(userId, notificationId);
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

  await updateAllNotificationsRead(userId, workspaceId);
}
