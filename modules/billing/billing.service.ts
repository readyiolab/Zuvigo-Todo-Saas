import { query, type RowDataPacket } from "@/infrastructure/database/connection";

export type SubscriptionPlan = "free" | "pro" | "business" | "enterprise";
export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing"
  | "incomplete";

export async function getWorkspaceSubscription(workspaceId: string) {
  type Row = RowDataPacket & {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
  };
  const rows = await query<Row[]>(
    `SELECT plan, status FROM tbl_subscriptions
     WHERE workspace_id = :workspaceId
     LIMIT 1`,
    { workspaceId }
  );
  const row = rows[0];
  if (!row) {
    return { plan: "free" as const, status: "active" as const };
  }
  return { plan: row.plan, status: row.status };
}
