"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Plus, X } from "lucide-react";
import { inviteMemberAction } from "@/modules/workspaces/workspace.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type MemberOption = { userId: string; name: string; email: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string) {
  return EMAIL_RE.test(value.trim());
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function PersonRow({
  member,
  onRemove,
  disabled,
  compact,
}: {
  member: MemberOption;
  onRemove?: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="group/person flex min-w-0 items-center gap-2">
      <Avatar size="sm" className="size-6 shrink-0">
        <AvatarFallback className="text-[9px] font-medium">
          {initials(member.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body leading-tight">{member.name}</p>
        {!compact ? (
          <p className="truncate text-caption text-muted-foreground">
            {member.email}
          </p>
        ) : null}
      </div>
      {onRemove && !disabled ? (
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className="size-6 shrink-0 opacity-0 transition-opacity group-hover/person:opacity-100 focus-visible:opacity-100"
          aria-label={`Remove ${member.name}`}
          onClick={onRemove}
        >
          <X className="size-3" />
        </Button>
      ) : null}
    </div>
  );
}

export function AssigneePicker({
  members,
  value,
  onChange,
  disabled,
  workspaceId,
  canInvite,
  emptyLabel = "No one assigned",
  addLabel = "Add people",
  compact = false,
  inlineSummary = false,
}: {
  members: MemberOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  workspaceId?: string;
  canInvite?: boolean;
  emptyLabel?: string;
  addLabel?: string;
  compact?: boolean;
  /** Single-line trigger for property rows */
  inlineSummary?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pendingEmails, setPendingEmails] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const selected = useMemo(
    () => members.filter((m) => value.includes(m.userId)),
    [members, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  }, [members, query]);

  const queryEmail = query.trim().toLowerCase();
  const queryIsEmail = isValidEmail(queryEmail);
  const memberExistsForEmail = useMemo(() => {
    if (!queryIsEmail) return false;
    return members.some((m) => m.email.toLowerCase() === queryEmail);
  }, [members, queryEmail, queryIsEmail]);

  const showInvite =
    Boolean(canInvite && workspaceId) &&
    queryIsEmail &&
    !memberExistsForEmail;

  const summary =
    selected.length === 0
      ? emptyLabel
      : selected
          .slice(0, 2)
          .map((m) => m.name)
          .join(", ") +
        (selected.length > 2 ? ` +${selected.length - 2}` : "");

  function invite(emailRaw: string) {
    if (!workspaceId || !canInvite) return;
    const email = emailRaw.trim().toLowerCase();
    if (!isValidEmail(email)) {
      toast.error("Enter a valid email to invite");
      return;
    }
    if (members.some((m) => m.email.toLowerCase() === email)) {
      const member = members.find((m) => m.email.toLowerCase() === email);
      if (member && !value.includes(member.userId)) {
        onChange([...value, member.userId]);
      }
      toast.success(`${member?.name ?? email} is already on the team`);
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("email", email);
      fd.set("role", "MEMBER");
      const result = await inviteMemberAction(workspaceId, fd);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      const alreadyPending = Boolean(
        (result.data as { alreadyPending?: boolean } | undefined)?.alreadyPending
      );
      toast.success(
        alreadyPending
          ? `Invite already pending for ${email}`
          : `Invite sent to ${email}`
      );
      setPendingEmails((prev) =>
        prev.includes(email) ? prev : [...prev, email]
      );
      setQuery("");
      router.refresh();
    });
  }

  const pickerPopover = !disabled ? (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger
        render={
          inlineSummary ? (
            <button
              type="button"
              className={cn(
                "inline-flex h-7 items-center justify-start gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2.5 py-0.5 text-xs font-medium transition-colors hover:border-border hover:bg-muted/60",
                selected.length === 0
                  ? "text-muted-foreground"
                  : "text-foreground"
              )}
            />
          ) : (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              className="h-7 gap-1 px-1.5 text-caption text-muted-foreground hover:text-foreground"
            />
          )
        }
      >
        {inlineSummary ? (
          <span className="inline-flex items-center gap-1.5 truncate">
            {selected.length > 0 ? (
              <Avatar size="sm" className="size-4 shrink-0">
                <AvatarFallback className="text-[8px] font-semibold">
                  {initials(selected[0].name)}
                </AvatarFallback>
              </Avatar>
            ) : null}
            <span className="truncate">{summary}</span>
          </span>
        ) : (
          <>
            <Plus className="size-3" />
            {addLabel}
          </>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <div className="space-y-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people…"
            className="h-8 focus-visible:ring-2 focus-visible:ring-ring/30"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && showInvite) {
                e.preventDefault();
                invite(query);
              }
            }}
          />
          {pendingEmails.length > 0 ? (
            <ul className="space-y-1 border-b border-border/50 pb-2">
              {pendingEmails.map((email) => (
                <li
                  key={email}
                  className="flex items-center gap-2 rounded-md bg-primary-soft/40 px-2 py-1.5"
                >
                  <Mail className="size-3.5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-primary">
                      Pending invite
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {email}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          {members.length === 0 && !showInvite ? (
            <p className="px-1 text-caption text-muted-foreground">
              No members to assign.
              {canInvite
                ? " Type an email to invite someone."
                : ""}
            </p>
          ) : (
            <ul className="max-h-52 space-y-0.5 overflow-y-auto">
              {filtered.map((member) => {
                const checked = value.includes(member.userId);
                return (
                  <li key={member.userId}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none transition-colors",
                        "hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/30",
                        checked && "bg-primary-soft/60 text-foreground hover:bg-primary-soft/60"
                      )}
                      onClick={() => {
                        if (checked) {
                          onChange(
                            value.filter((id) => id !== member.userId)
                          );
                        } else {
                          onChange([...value, member.userId]);
                        }
                      }}
                    >
                      <Avatar size="sm" className="size-6 shrink-0">
                        <AvatarFallback className="text-[9px]">
                          {initials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body">
                          {member.name}
                        </span>
                        <span className="block truncate text-caption text-muted-foreground">
                          {member.email}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border text-[9px]",
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input"
                        )}
                        aria-hidden
                      >
                        {checked ? "✓" : null}
                      </span>
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 && !showInvite ? (
                <li className="px-2 py-1.5 text-caption text-muted-foreground">
                  No matching members
                  {canInvite
                    ? ". Enter a full email to invite."
                    : ""}
                </li>
              ) : null}
            </ul>
          )}
          {showInvite ? (
            <div className="space-y-1.5 border-t border-border/60 pt-2">
              <p className="px-1 text-caption text-muted-foreground">
                Not on the team yet. Invite them from here — assign after they
                join.
              </p>
              <Button
                type="button"
                size="sm"
                className="h-8 w-full gap-1.5"
                disabled={pending}
                onClick={() => invite(query)}
              >
                <Mail className="size-3.5" />
                Invite {query.trim()}
              </Button>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  ) : (
    <span
      className={cn(
        "truncate text-[14px]",
        selected.length === 0 ? "text-muted-foreground" : "text-foreground"
      )}
    >
      {summary}
    </span>
  );

  if (inlineSummary) {
    return <div className="min-w-0 flex-1 text-left">{pickerPopover}</div>;
  }

  return (
    <div className={cn("space-y-1.5", compact && "space-y-1")}>
      {selected.length > 0 ? (
        <ul className={cn("space-y-1.5", compact && "space-y-1")}>
          {selected.map((member) => (
            <li key={member.userId}>
              <PersonRow
                member={member}
                compact={compact}
                disabled={disabled}
                onRemove={() =>
                  onChange(value.filter((id) => id !== member.userId))
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-0.5 text-caption text-muted-foreground">{emptyLabel}</p>
      )}
      {pickerPopover}
    </div>
  );
}
