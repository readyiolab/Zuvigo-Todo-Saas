"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2 } from "lucide-react";
import {
  permanentlyDeletePageAction,
  restorePageAction,
} from "@/modules/pages/page.actions";
import type { PageRecord } from "@/modules/pages/page.types";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function TrashList({
  workspaceId,
  workspaceSlug,
  pages,
}: {
  workspaceId: string;
  workspaceSlug: string;
  pages: PageRecord[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (pages.length === 0) {
    return (
      <EmptyState
        title="Trash is empty"
        description="Pages you delete will appear here for restore or permanent deletion."
      />
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {pages.map((page) => (
        <li
          key={page.id}
          className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="truncate text-body font-medium">
              {page.icon ? `${page.icon} ` : ""}
              {page.title}
            </p>
            <p className="text-caption text-muted-foreground">Deleted page</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await restorePageAction({
                    workspaceId,
                    workspaceSlug,
                    pageId: page.id,
                  });
                  if (!result.success) {
                    toast.error(result.error.message);
                    return;
                  }
                  toast.success("Page restored");
                  router.refresh();
                });
              }}
            >
              <RotateCcw className="size-3.5" />
              Restore
            </Button>
            <ConfirmDialog
              title="Delete permanently?"
              description="This cannot be undone. Nested pages in trash will also be removed."
              confirmLabel="Delete forever"
              destructive
              onConfirm={async () => {
                const result = await permanentlyDeletePageAction({
                  workspaceId,
                  workspaceSlug,
                  pageId: page.id,
                });
                if (!result.success) {
                  toast.error(result.error.message);
                  return;
                }
                toast.success("Page permanently deleted");
                router.refresh();
              }}
              trigger={
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              }
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
