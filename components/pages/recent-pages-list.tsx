"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, FileText } from "lucide-react";
import type { PageRecord } from "@/modules/pages/page.types";
import { cn } from "@/lib/utils";

export function RecentPagesList({
  workspaceSlug,
  pages,
}: {
  workspaceSlug: string;
  pages: PageRecord[];
}) {
  const pathname = usePathname();

  if (pages.length === 0) {
    return (
      <p className="px-2 text-caption text-muted-foreground">
        Recently opened pages appear here
      </p>
    );
  }

  return (
    <ul className="space-y-0.5">
      {pages.map((page) => {
        const href = `/w/${workspaceSlug}/pages/${page.id}`;
        const active = pathname === href;
        return (
          <li key={page.id}>
            <Link
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-body",
                active
                  ? "bg-sidebar-accent font-medium"
                  : "hover:bg-sidebar-accent/60"
              )}
            >
              {page.icon ? (
                <span className="text-caption">{page.icon}</span>
              ) : (
                <Clock className="size-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">{page.title}</span>
              {!page.icon ? (
                <FileText className="ml-auto size-3 opacity-0" />
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
