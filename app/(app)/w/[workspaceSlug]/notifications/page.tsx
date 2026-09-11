import { Bell } from "lucide-react";
import { requireUser } from "@/modules/auth/auth.service";
import { getWorkspaceForUserBySlug } from "@/modules/workspaces/workspace.service";
import { listNotificationsForUser } from "@/modules/notifications/notification.service";
import { Screen, ScreenHeader } from "@/components/layout/screen";
import { ListContainer, ListRow } from "@/components/layout/list-row";
import { EmptyState } from "@/components/shared/empty-state";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const user = await requireUser();
  const { workspace } = await getWorkspaceForUserBySlug(workspaceSlug, user.id);
  const notifications = await listNotificationsForUser(user.id, workspace.id);

  return (
    <Screen>
      <ScreenHeader
        title="Notifications"
        description={
          notifications.length === 0
            ? "Mentions and assignments"
            : `${notifications.length} notification${notifications.length === 1 ? "" : "s"}`
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="When someone mentions you or assigns a task, it will show up here."
        />
      ) : (
        <ListContainer>
          {notifications.map((n) => (
            <ListRow key={n.id}>
              <div className="space-y-0.5">
                <p className="font-medium">{n.title}</p>
                {n.body ? (
                  <p className="text-caption text-muted-foreground">{n.body}</p>
                ) : null}
              </div>
            </ListRow>
          ))}
        </ListContainer>
      )}
    </Screen>
  );
}
