import {
  findSubscriptionByWorkspaceId,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from "@/modules/billing/billing.repository";

export type { SubscriptionPlan, SubscriptionStatus };

export async function getWorkspaceSubscription(workspaceId: string) {
  const row = await findSubscriptionByWorkspaceId(workspaceId);
  if (!row) {
    return { plan: "free" as const, status: "active" as const };
  }
  return { plan: row.plan, status: row.status };
}
