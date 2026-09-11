import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/infrastructure/database/connection";
import { createId } from "@/shared/utils/id";
import type { PlanSlot } from "@/modules/productivity/planner.service";

type PlanRow = RowDataPacket & {
  id: string;
  workspace_id: string;
  user_id: string;
  plan_date: string;
  slots: string | PlanSlot[];
};

export async function upsertDailyPlan(input: {
  workspaceId: string;
  userId: string;
  planDate: string;
  slots: PlanSlot[];
}) {
  const existing = await query<PlanRow[]>(
    `SELECT id FROM tbl_daily_plans
     WHERE workspace_id = :workspaceId AND user_id = :userId AND plan_date = :planDate
     LIMIT 1`,
    {
      workspaceId: input.workspaceId,
      userId: input.userId,
      planDate: input.planDate,
    }
  );

  const payload = JSON.stringify(input.slots);

  if (existing[0]) {
    await execute(
      `UPDATE tbl_daily_plans SET slots = :slots WHERE id = :id`,
      { id: existing[0].id, slots: payload }
    );
    return existing[0].id;
  }

  const id = createId();
  await execute(
    `INSERT INTO tbl_daily_plans (id, workspace_id, user_id, plan_date, slots)
     VALUES (:id, :workspaceId, :userId, :planDate, :slots)`,
    {
      id,
      workspaceId: input.workspaceId,
      userId: input.userId,
      planDate: input.planDate,
      slots: payload,
    }
  );
  return id;
}

export async function getDailyPlan(input: {
  workspaceId: string;
  userId: string;
  planDate: string;
}) {
  const rows = await query<PlanRow[]>(
    `SELECT * FROM tbl_daily_plans
     WHERE workspace_id = :workspaceId AND user_id = :userId AND plan_date = :planDate
     LIMIT 1`,
    input
  );
  const row = rows[0];
  if (!row) return null;
  const slots =
    typeof row.slots === "string" ? (JSON.parse(row.slots) as PlanSlot[]) : row.slots;
  return { id: row.id, planDate: row.plan_date, slots };
}

export type NotificationPrefs = {
  upcomingDeadline: boolean;
  overdue: boolean;
  assignment: boolean;
  dailyPlan: boolean;
  recurring: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  upcomingDeadline: true,
  overdue: true,
  assignment: true,
  dailyPlan: true,
  recurring: true,
};

type PrefsRow = RowDataPacket & {
  id: string;
  prefs: string | NotificationPrefs;
};

export async function getNotificationPrefs(input: {
  workspaceId: string;
  userId: string;
}): Promise<NotificationPrefs> {
  const rows = await query<PrefsRow[]>(
    `SELECT prefs FROM tbl_notification_prefs
     WHERE workspace_id = :workspaceId AND user_id = :userId
     LIMIT 1`,
    input
  );
  if (!rows[0]) return { ...DEFAULT_NOTIFICATION_PREFS };
  const raw =
    typeof rows[0].prefs === "string"
      ? (JSON.parse(rows[0].prefs) as NotificationPrefs)
      : rows[0].prefs;
  return { ...DEFAULT_NOTIFICATION_PREFS, ...raw };
}

export async function upsertNotificationPrefs(input: {
  workspaceId: string;
  userId: string;
  prefs: NotificationPrefs;
}) {
  const existing = await query<PrefsRow[]>(
    `SELECT id FROM tbl_notification_prefs
     WHERE workspace_id = :workspaceId AND user_id = :userId
     LIMIT 1`,
    { workspaceId: input.workspaceId, userId: input.userId }
  );
  const payload = JSON.stringify(input.prefs);
  if (existing[0]) {
    await execute(`UPDATE tbl_notification_prefs SET prefs = :prefs WHERE id = :id`, {
      id: existing[0].id,
      prefs: payload,
    });
    return;
  }
  await execute(
    `INSERT INTO tbl_notification_prefs (id, workspace_id, user_id, prefs)
     VALUES (:id, :workspaceId, :userId, :prefs)`,
    {
      id: createId(),
      workspaceId: input.workspaceId,
      userId: input.userId,
      prefs: payload,
    }
  );
}
