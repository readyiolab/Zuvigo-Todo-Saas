"use client";

import { useState, useTransition } from "react";
import { Copy, MoreHorizontal, Star, Trash2 } from "lucide-react";
import {
  deletePageAction,
  duplicatePageAction,
  toggleFavoriteAction,
  updatePageTitleAction,
} from "@/modules/pages/page.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export function DocumentTitleBar({
  workspaceId,
  workspaceSlug,
  pageId,
  title,
  icon = null,
  isFavorite,
  canEdit,
  canDelete,
  saveStateLabel,
}: {
  workspaceId: string;
  workspaceSlug: string;
  pageId: string;
  title: string;
  icon?: string | null;
  isFavorite: boolean;
  canEdit: boolean;
  canDelete: boolean;
  saveStateLabel?: string;
}) {
  const [value, setValue] = useState(title);
  const [favorited, setFavorited] = useState(isFavorite);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function saveTitle() {
    if (!canEdit || value.trim() === title) return;
    startTransition(async () => {
      await updatePageTitleAction({
        workspaceId,
        workspaceSlug,
        pageId,
        title: value.trim() || "Untitled",
      });
    });
  }

  return (
    <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {icon ? (
          <span className="text-title" aria-hidden>
            {icon}
          </span>
        ) : null}
        <Input
          value={value}
          disabled={!canEdit || pending}
          onChange={(e) => setValue(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="border-0 border-b border-transparent px-0 text-title shadow-none focus-visible:border-border focus-visible:ring-0"
          aria-label="Page title"
        />
      </div>
      <div className="flex items-center gap-1">
        {saveStateLabel ? (
          <span className="mr-2 hidden text-caption text-muted-foreground sm:inline">
            {saveStateLabel}
          </span>
        ) : null}
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Favorite"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await toggleFavoriteAction({
                workspaceId,
                workspaceSlug,
                pageId,
              });
              if (result.success && result.data) {
                setFavorited(
                  Boolean((result.data as { favorited: boolean }).favorited)
                );
              }
            });
          }}
        >
          <Star
            className={cn("size-4", favorited && "fill-warning text-warning")}
          />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button type="button" size="icon-sm" variant="ghost" />
            }
          >
            <MoreHorizontal className="size-4" />
            <span className="sr-only">More</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit ? (
              <DropdownMenuItem
                onClick={() => {
                  startTransition(async () => {
                    await duplicatePageAction({
                      workspaceId,
                      workspaceSlug,
                      pageId,
                    });
                  });
                }}
              >
                <Copy className="size-3.5" />
                Duplicate
              </DropdownMenuItem>
            ) : null}
            {canDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="size-3.5" />
                  Move to trash
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        {canDelete ? (
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent className="rounded-lg">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-title normal-case tracking-normal">
                  Move this page to trash?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-body">
                  Nested pages will also move to trash. You can restore them
                  later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => {
                    startTransition(async () => {
                      await deletePageAction({
                        workspaceId,
                        workspaceSlug,
                        pageId,
                      });
                    });
                  }}
                >
                  Move to trash
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
    </div>
  );
}
