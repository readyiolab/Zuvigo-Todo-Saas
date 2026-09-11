import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-8 text-center",
        className
      )}
    >
      {Icon ? (
        <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="size-5" aria-hidden />
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-body font-medium text-foreground">{title}</p>
        {description ? (
          <p className="max-w-form text-caption text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
