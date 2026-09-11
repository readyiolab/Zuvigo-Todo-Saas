import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Screen({
  children,
  className,
  density = "wide",
}: {
  children: ReactNode;
  className?: string;
  /** `wide` for data screens; `prose` for readable docs/forms. */
  density?: "wide" | "prose";
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full space-y-4",
        density === "prose" ? "max-w-content" : "max-w-wide",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ScreenHeader({
  title,
  description,
  action,
  menu,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  menu?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <h1 className="text-title text-foreground">{title}</h1>
        {description ? (
          <div className="text-caption text-muted-foreground">{description}</div>
        ) : null}
      </div>
      {(action || menu) && (
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {menu}
        </div>
      )}
    </div>
  );
}
