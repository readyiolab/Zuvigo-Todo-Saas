"use client";

import { cn } from "@/lib/utils";
import type { InviteScope } from "@/lib/invite-permission";

export function InviteScopeSelector({
  value,
  onChange,
  pageOnlyAvailable,
  disabled,
}: {
  value: InviteScope;
  onChange: (value: InviteScope) => void;
  pageOnlyAvailable?: boolean;
  disabled?: boolean;
}) {
  const options: {
    value: InviteScope;
    title: string;
    description: string;
    disabled?: boolean;
  }[] = [
    {
      value: "workspace",
      title: "Add to Workspace",
      description: "Invite and bill as a Member",
    },
    {
      value: "page",
      title: "Add to page only",
      description: "Invite as a Guest",
      disabled: !pageOnlyAvailable,
    },
  ];

  return (
    <div
      className="grid gap-2 sm:grid-cols-2"
      role="radiogroup"
      aria-label="Invite scope"
    >
      {options.map((option) => {
        const selected = value === option.value;
        const isDisabled = disabled || option.disabled;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={isDisabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-lg border px-3 py-3 text-left transition-colors",
              selected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-background hover:bg-muted/40",
              isDisabled && "cursor-not-allowed opacity-50"
            )}
          >
            <p className="text-body font-medium">{option.title}</p>
            <p className="mt-0.5 text-caption text-muted-foreground">
              {option.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
