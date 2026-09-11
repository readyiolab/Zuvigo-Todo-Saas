import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function AuthShell({
  title,
  description,
  children,
  footer,
  className,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-full flex-1 items-center justify-center px-gutter py-16",
        className
      )}
    >
      <div className="w-full max-w-form space-y-6">
        <div className="space-y-6 text-center">
          <Link
            href="/"
            className="inline-block text-body font-semibold text-foreground"
          >
            Zuvigo
          </Link>
          <div className="space-y-1">
            <h1 className="text-title text-foreground">{title}</h1>
            <p className="text-body text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
        {footer}
      </div>
    </div>
  );
}
