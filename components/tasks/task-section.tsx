"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
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
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <h3
          className={cn(
            "text-[15px] font-semibold tracking-tight text-foreground",
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
  children,
  interactive = true,
  className,
}: {
  label: string;
  children: ReactNode;
  interactive?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group flex min-h-9 items-center gap-2 rounded-md px-1.5 py-1 transition-colors",
        interactive && "hover:bg-muted/35",
        className
      )}
    >
      <div className="w-[5.5rem] shrink-0 text-[12px] text-muted-foreground">
        {label}
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1 text-right text-[13px] text-foreground">
        {children}
        {interactive ? (
          <ChevronRight className="size-3 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
        ) : null}
      </div>
    </div>
  );
}
