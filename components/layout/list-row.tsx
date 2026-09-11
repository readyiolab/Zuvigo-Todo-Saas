import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ListRow({
  children,
  trailing,
  className,
  href,
}: {
  children: ReactNode;
  trailing?: ReactNode;
  className?: string;
  href?: string;
}) {
  const content = (
    <div
      className={cn(
        "flex min-h-(--row-h) items-center gap-2.5 px-2.5 py-1.5 text-body",
        href &&
          "transition-colors duration-(--duration-fast) hover:bg-muted/40",
        className
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );

  if (href) {
    return (
      <li className="border-b border-border/60 last:border-b-0">
        <Link href={href} className="block">
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li className="border-b border-border/60 last:border-b-0">{content}</li>
  );
}

export function ListContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "overflow-hidden rounded-lg border border-border/80",
        className
      )}
    >
      {children}
    </ul>
  );
}
