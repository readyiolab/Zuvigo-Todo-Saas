"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TaskSection({
  title,
  children,
  className,
  muted,
  action,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  muted?: boolean;
  action?: ReactNode;
}) {
  return (
    <section className={cn("space-y-3.5", className)}>
      <div className="flex items-center justify-between gap-3">
        <h3
          className={cn(
            "text-sm font-semibold tracking-tight text-foreground",
            muted && "text-muted-foreground"
          )}
        >
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function TaskEmptyState({
  description,
  actionLabel,
  onAction,
  canAct,
}: {
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  canAct?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <p className="text-[13px] text-muted-foreground">{description}</p>
      {canAct && actionLabel && onAction ? (
        <Button
          type="button"
          size="xs"
          variant="ghost"
          className="h-7 px-2 text-[13px] text-foreground/80 hover:text-foreground"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function TaskPropertyRow({
  label,
  icon,
  children,
  interactive = true,
  className,
}: {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
  interactive?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group flex min-h-9 items-center gap-3 rounded-lg px-2.5 py-1 transition-colors",
        interactive && "hover:bg-muted/40",
        className
      )}
    >
      <div className="flex w-32 shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon ? (
          <span className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden>
            {icon}
          </span>
        ) : null}
        <span className="truncate">{label}</span>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-start text-left text-xs text-foreground">
        {children}
      </div>
    </div>
  );
}
