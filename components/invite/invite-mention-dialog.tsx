"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { inviteMembersBatchAction } from "@/modules/workspaces/workspace.actions";
import { EmailInviteInput } from "@/components/invite/email-invite-input";
import { PermissionSelector } from "@/components/invite/permission-selector";
import { InviteScopeSelector } from "@/components/invite/invite-scope-selector";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  accessLevelToPagePermission,
  accessLevelToWorkspaceRole,
  type InviteAccessLevel,
  type InviteScope,
} from "@/lib/invite-permission";

export function InviteMentionDialog({
  workspaceId,
  pageId,
  canInvite,
  plan = "free",
  triggerLabel = "Invite",
  triggerVariant = "default",
  triggerSize = "sm",
  triggerClassName,
  iconTrigger,
}: {
  workspaceId: string;
  pageId?: string;
  canInvite: boolean;
  plan?: string;
  triggerLabel?: string;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerSize?: React.ComponentProps<typeof Button>["size"];
  triggerClassName?: string;
  iconTrigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);
  const [access, setAccess] = useState<InviteAccessLevel>("full_access");
  const [scope, setScope] = useState<InviteScope>("workspace");
  const [pending, startTransition] = useTransition();

  const showPlusBadge = plan === "free";
  const pageOnlyAvailable = Boolean(pageId);

  function resetForm() {
    setEmails([]);
    setAccess("full_access");
    setScope("workspace");
  }

  function submit() {
    if (!canInvite || emails.length === 0 || pending) return;

    const role = accessLevelToWorkspaceRole(access, scope);
    const pagePermission = accessLevelToPagePermission(access);

    startTransition(async () => {
      const result = await inviteMembersBatchAction({
        workspaceId,
        emails,
        role,
        scope,
        pageId: scope === "page" ? pageId : undefined,
        pagePermission: scope === "page" ? pagePermission : undefined,
      });

      if (!result.success) {
        toast.error(result.error.message || "Could not send invites");
        return;
      }

      const data = result.data as {
        sent: number;
        pending: number;
        granted: number;
        failed: number;
      };

      if (
        data.failed > 0 &&
        data.sent === 0 &&
        data.pending === 0 &&
        data.granted === 0
      ) {
        toast.error("Invites failed. Check emails and try again.");
        return;
      }

      const parts: string[] = [];
      if (data.sent > 0) parts.push(`${data.sent} invited`);
      if (data.pending > 0) parts.push(`${data.pending} already pending`);
      if (data.granted > 0) parts.push(`${data.granted} page access updated`);
      if (data.failed > 0) parts.push(`${data.failed} failed`);
      toast.success(parts.join(" · ") || "Invites sent");

      resetForm();
      setOpen(false);
      router.refresh();
    });
  }

  if (!canInvite) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={triggerVariant}
            size={iconTrigger ? "icon-sm" : triggerSize}
            className={triggerClassName}
            aria-label={iconTrigger ? triggerLabel : undefined}
          />
        }
      >
        {iconTrigger ?? triggerLabel}
      </DialogTrigger>
      <DialogContent
        showCloseButton
        className="gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <DialogHeader className="flex flex-row items-center gap-2 space-y-0 border-b border-border px-4 py-3 pr-12">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Back"
            onClick={() => setOpen(false)}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <DialogTitle className="text-body font-semibold normal-case tracking-normal">
              Invite and mention
            </DialogTitle>
            <DialogDescription className="sr-only">
              Invite people by email and choose access level
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-4 py-4">
          <EmailInviteInput
            emails={emails}
            onChange={setEmails}
            disabled={pending}
            trailing={
              <PermissionSelector
                value={access}
                onChange={setAccess}
                showPlusBadge={showPlusBadge}
                disabled={pending}
              />
            }
          />

          <InviteScopeSelector
            value={scope}
            onChange={setScope}
            pageOnlyAvailable={pageOnlyAvailable}
            disabled={pending}
          />

          <Button
            type="button"
            className="w-full"
            disabled={pending || emails.length === 0}
            onClick={submit}
          >
            {pending ? <Spinner className="size-3.5" /> : null}
            Invite
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
