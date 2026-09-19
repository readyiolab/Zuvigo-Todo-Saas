"use client";

import { ProfileForm } from "@/components/settings/profile-form";
import { NotificationPrefsForm } from "@/components/productivity/notification-prefs-form";
import type { NotificationPrefs } from "@/modules/productivity/plan.repository";
import { InviteMentionDialog } from "@/components/invite/invite-mention-dialog";
import { Screen, ScreenHeader } from "@/components/layout/screen";
import { ListContainer, ListRow } from "@/components/layout/list-row";
import { EmptyState } from "@/components/shared/empty-state";
import { Section } from "@/components/shared/section";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import {
  archiveWorkspaceAction,
  removeMemberAction,
  updateMemberRoleAction,
  updateWorkspaceAction,
} from "@/modules/workspaces/workspace.actions";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Users } from "lucide-react";

type Member = {
  id: string;
  userId: string;
  role: string;
  email: string;
  name: string;
};

export function WorkspaceSettings({
  workspaceId,
  workspaceSlug,
  workspaceName,
  role,
  members,
  canManage,
  isOwner,
  user,
  subscription,
  notificationPrefs,
}: {
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  role: string;
  members: Member[];
  canManage: boolean;
  isOwner: boolean;
  user: { name: string; email: string };
  subscription: { plan: string; status: string };
  notificationPrefs: NotificationPrefs;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Screen density="prose">
      <ScreenHeader
        title="Settings"
        description="Profile, workspace details, and members"
      />

      <Section
        title="Profile"
        description="Your account details across workspaces."
      >
        <ProfileForm name={user.name} email={user.email} />
      </Section>

      <Separator />

      <Section
        title="Notifications"
        description="Choose which reminders you receive in this workspace."
      >
        <NotificationPrefsForm
          workspaceId={workspaceId}
          workspaceSlug={workspaceSlug}
          initial={notificationPrefs}
        />
      </Section>

      <Separator />

      <Section
        title="Plan"
        description="Current workspace subscription."
      >
        <p className="text-body">
          <span className="font-medium capitalize">{subscription.plan}</span>
          <span className="text-muted-foreground">
            {" "}
            · {subscription.status}
          </span>
        </p>
      </Section>

      <Separator />

      <Section
        title="General"
        description="Basic workspace information visible to all members."
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canManage) return;
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              await updateWorkspaceAction(workspaceId, formData);
              router.refresh();
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={workspaceName}
              required
              disabled={!canManage || pending}
            />
          </div>
          {canManage ? (
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Spinner className="size-3.5" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          ) : null}
        </form>
      </Section>

      <Separator />

      <Section
        title="Members"
        description="People with access to this workspace."
      >
        {members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members"
            description="Invite teammates to collaborate."
          />
        ) : (
          <ListContainer>
            {members.map((member) => (
              <ListRow
                key={member.id}
                trailing={
                  canManage && member.role !== "OWNER" ? (
                    <MemberRowMenu workspaceId={workspaceId} member={member} />
                  ) : (
                    <span className="text-caption text-muted-foreground">
                      {member.role}
                    </span>
                  )
                }
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{member.name}</p>
                  <p className="truncate text-caption text-muted-foreground">
                    {member.email}
                  </p>
                </div>
              </ListRow>
            ))}
          </ListContainer>
        )}

        {canManage ? (
          <div className="pt-2">
            <InviteMentionDialog
              workspaceId={workspaceId}
              canInvite={canManage}
              plan={subscription.plan}
              triggerLabel="Invite"
            />
          </div>
        ) : (
          <p className="text-caption text-muted-foreground">
            Your role: {role}. Only admins can invite members.
          </p>
        )}
      </Section>

      {isOwner ? (
        <>
          <Separator />
          <Section
            title="Danger zone"
            description="Irreversible or high-impact actions."
          >
            <ConfirmDialog
              title="Archive this workspace?"
              description="Members will lose access. You can contact support to restore it later."
              confirmLabel="Archive workspace"
              destructive
              onConfirm={async () => {
                await archiveWorkspaceAction(workspaceId);
              }}
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                >
                  Archive workspace
                </Button>
              }
            />
          </Section>
        </>
      ) : null}
    </Screen>
  );
}

function MemberRowMenu({
  workspaceId,
  member,
}: {
  workspaceId: string;
  member: Member;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" size="icon-sm" variant="ghost" />}
      >
        <MoreHorizontal className="size-4" />
        <span className="sr-only">Member actions</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(["ADMIN", "MEMBER", "GUEST"] as const).map((nextRole) => (
          <DropdownMenuItem
            key={nextRole}
            disabled={pending || member.role === nextRole}
            onClick={() => {
              const formData = new FormData();
              formData.set("memberId", member.id);
              formData.set("role", nextRole);
              startTransition(async () => {
                await updateMemberRoleAction(workspaceId, formData);
                router.refresh();
              });
            }}
          >
            Make {nextRole.charAt(0) + nextRole.slice(1).toLowerCase()}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await removeMemberAction(workspaceId, member.id);
              router.refresh();
            });
          }}
        >
          Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
