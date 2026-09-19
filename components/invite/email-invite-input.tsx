"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { addEmailChip } from "@/lib/invite-permission";

export function EmailInviteInput({
  emails,
  onChange,
  disabled,
  trailing,
  className,
}: {
  emails: string[];
  onChange: (emails: string[]) => void;
  disabled?: boolean;
  trailing?: React.ReactNode;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function commit(raw: string) {
    const result = addEmailChip(emails, raw);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    onChange(result.emails);
    setDraft("");
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className={cn(
          "flex min-h-10 items-start gap-2 rounded-lg border border-border bg-background px-2 py-1.5",
          "focus-within:ring-2 focus-within:ring-ring/30"
        )}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {emails.map((email) => (
            <Badge
              key={email}
              variant="soft"
              className="gap-1 rounded-md px-2 py-0.5 font-normal normal-case tracking-normal"
            >
              <span className="max-w-[10rem] truncate">{email}</span>
              <button
                type="button"
                className="rounded-sm text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${email}`}
                disabled={disabled}
                onClick={() => onChange(emails.filter((e) => e !== email))}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <Input
            value={draft}
            disabled={disabled}
            placeholder={emails.length === 0 ? "Add emails..." : "Add more..."}
            aria-label="Add emails"
            className="h-7 min-w-[8rem] flex-1 border-0 px-1 shadow-none focus-visible:ring-0"
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                commit(draft);
              } else if (
                e.key === "Backspace" &&
                draft === "" &&
                emails.length > 0
              ) {
                onChange(emails.slice(0, -1));
              }
            }}
            onBlur={() => {
              if (draft.trim()) commit(draft);
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (/[,;\s]/.test(text)) {
                e.preventDefault();
                commit(text);
              }
            }}
          />
        </div>
        {trailing ? (
          <div className="shrink-0 self-center">{trailing}</div>
        ) : null}
      </div>
      {error ? (
        <p className="text-caption text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
