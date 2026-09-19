"use client";

import { useTransition } from "react";
import Link from "next/link";
import { FilePlus, FileText, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { createPageAction } from "@/modules/pages/page.actions";
import type { PageRecord } from "@/modules/pages/page.types";
import { cn } from "@/lib/utils";

export function RecentPagesGrid({
  workspaceId,
  workspaceSlug,
  pages,
}: {
  workspaceId: string;
  workspaceSlug: string;
  pages: PageRecord[];
}) {
  const [pending, startTransition] = useTransition();
  const base = `/w/${workspaceSlug}`;

  function createNewPage() {
    startTransition(async () => {
      await createPageAction({
        workspaceId,
        workspaceSlug,
      });
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
          Recently visited
        </h2>
        <button
          type="button"
          onClick={createNewPage}
          disabled={pending}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="size-3" />
          <span>New page</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {pages.slice(0, 7).map((page) => {
          let timeAgo = "";
          try {
            timeAgo = formatDistanceToNow(new Date(page.updatedAt), {
              addSuffix: true,
            });
          } catch {
            timeAgo = "recently";
          }

          return (
            <Link
              key={page.id}
              href={`${base}/pages/${page.id}`}
              className={cn(
                "group flex flex-col justify-between rounded-lg border border-border/70 bg-card p-3",
                "transition-all hover:border-border hover:bg-muted/40 hover:shadow-xs"
              )}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="flex size-7 shrink-0 items-center justify-center rounded bg-muted/60 text-base group-hover:scale-105 transition-transform">
                  {page.icon || <FileText className="size-4 text-muted-foreground" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                    {page.title || "Untitled"}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground mt-0.5">
                    {timeAgo}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}

        {/* 1-Click New Page Card */}
        <button
          type="button"
          onClick={createNewPage}
          disabled={pending}
          className={cn(
            "flex items-center gap-2.5 rounded-lg border border-dashed border-border/80 bg-muted/20 p-3 text-left",
            "transition-all hover:border-border hover:bg-muted/50 hover:text-foreground text-muted-foreground"
          )}
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded border border-border/60 bg-card text-muted-foreground">
            <Plus className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium">New page</p>
            <p className="text-[10px] text-muted-foreground">Add to workspace</p>
          </div>
        </button>
      </div>
    </div>
  );
}
