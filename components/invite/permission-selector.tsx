"use client";

import { Check, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  INVITE_ACCESS_OPTIONS,
  accessLevelLabel,
  type InviteAccessLevel,
} from "@/lib/invite-permission";
import { cn } from "@/lib/utils";

export function PermissionSelector({
  value,
  onChange,
  showPlusBadge,
  disabled,
}: {
  value: InviteAccessLevel;
  onChange: (value: InviteAccessLevel) => void;
  showPlusBadge?: boolean;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-body font-medium"
            aria-label={`Permission: ${accessLevelLabel(value)}`}
          />
        }
      >
        {accessLevelLabel(value)}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64 rounded-lg p-1.5">
        {INVITE_ACCESS_OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <DropdownMenuItem
              key={option.value}
              className={cn(
                "flex cursor-pointer items-start gap-2 rounded-md px-2.5 py-2",
                selected && "bg-accent"
              )}
              onClick={() => onChange(option.value)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{option.label}</span>
                  {option.plus && showPlusBadge ? (
                    <Badge
                      variant="info"
                      className="rounded px-1 py-0 text-[10px] font-semibold uppercase tracking-wide"
                    >
                      Plus
                    </Badge>
                  ) : null}
                </div>
                <p className="text-caption text-muted-foreground">
                  {option.description}
                </p>
              </div>
              {selected ? (
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              ) : (
                <span className="size-4 shrink-0" aria-hidden />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
