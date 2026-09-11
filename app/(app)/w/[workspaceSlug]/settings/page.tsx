import { requireUser } from "@/modules/auth/auth.service";
import { getWorkspaceSubscription } from "@/modules/billing/billing.service";
import {
  getWorkspaceForUserBySlug,
  getWorkspaceMembers,
} from "@/modules/workspaces/workspace.service";
import { WorkspaceSettings } from "@/components/workspaces/workspace-settings";
import { getNotificationPrefs } from "@/modules/productivity/plan.repository";

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const user = await requireUser();
  const { workspace, membership } = await getWorkspaceForUserBySlug(
    workspaceSlug,
    user.id
  );
  const [members, subscription, notificationPrefs] = await Promise.all([
    getWorkspaceMembers(workspace.id, user.id),
    getWorkspaceSubscription(workspace.id),
    getNotificationPrefs({ workspaceId: workspace.id, userId: user.id }),
  ]);
  const canManage = membership.role === "OWNER" || membership.role === "ADMIN";

  return (
    <WorkspaceSettings
      workspaceId={workspace.id}
      workspaceSlug={workspaceSlug}
      workspaceName={workspace.name}
      role={membership.role}
      members={members}
      canManage={canManage}
      isOwner={membership.role === "OWNER"}
      user={{ name: user.name, email: user.email }}
      subscription={subscription}
      notificationPrefs={notificationPrefs}
    />
  );
}
