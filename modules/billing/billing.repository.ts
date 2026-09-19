import { query, type RowDataPacket } from "@/infrastructure/database/connection";

export type SubscriptionPlan = "free" | "pro" | "business" | "enterprise";
export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing"
  | "incomplete";

export type SubscriptionRow = RowDataPacket & {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
};

export async function findSubscriptionByWorkspaceId(
  workspaceId: string
): Promise<SubscriptionRow | null> {
  const rows = await query<SubscriptionRow[]>(
    `SELECT plan, status FROM tbl_subscriptions
     WHERE workspace_id = :workspaceId
     LIMIT 1`,
    { workspaceId }
  );
  return rows[0] ?? null;
}
