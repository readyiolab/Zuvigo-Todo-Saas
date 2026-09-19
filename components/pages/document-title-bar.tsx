"use client";

import { useState, useTransition } from "react";
import { Check, Copy, MoreHorizontal, Share2, Star, Trash2 } from "lucide-react";
import {
  deletePageAction,
  duplicatePageAction,
  toggleFavoriteAction,
  updatePageTitleAction,
} from "@/modules/pages/page.actions";
import { SetBreadcrumbs } from "@/components/layout/breadcrumbs";
import { InviteMentionDialog } from "@/components/invite/invite-mention-dialog";
import { Button } from "@/components/ui/button";
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
  canInvite = false,
  plan = "free",
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
  canInvite?: boolean;
  plan?: string;
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
    <div className="space-y-4 pb-2">
      {/* Set dynamic breadcrumbs for top bar */}
      <SetBreadcrumbs
        crumbs={[
          { label: "Documents", href: `/w/${workspaceSlug}/pages` },
          { label: value || "Untitled" },
        ]}
      />

      {/* Top Document Action Strip */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2">
          {saveStateLabel ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/80">
              <Check className="size-3 text-muted-foreground/60" />
              <span>{saveStateLabel}</span>
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground/60">Saved</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {canInvite ? (
            <InviteMentionDialog
              workspaceId={workspaceId}
              pageId={pageId}
              canInvite={canInvite}
              plan={plan}
              triggerLabel="Share"
              triggerVariant="ghost"
              iconTrigger={<Share2 className="size-3.5" />}
            />
          ) : null}

          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Favorite"
            disabled={pending}
            className="size-7 text-muted-foreground hover:text-foreground"
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
              className={cn("size-3.5", favorited && "fill-warning text-warning")}
            />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="size-7 text-muted-foreground hover:text-foreground"
                />
              }
            >
              <MoreHorizontal className="size-3.5" />
              <span className="sr-only">More</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 text-xs">
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
                  <Copy className="mr-2 size-3.5" />
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
                    <Trash2 className="mr-2 size-3.5" />
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

      {/* Notion-style Document Header: Large Icon & Borderless Canvas Title */}
      <div className="space-y-2 pt-2">
        {icon ? (
          <div className="text-4xl" aria-hidden>
            {icon}
          </div>
        ) : null}
        <input
          value={value}
          disabled={!canEdit || pending}
          onChange={(e) => setValue(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          placeholder="Untitled"
          className={cn(
            "w-full bg-transparent border-0 p-0 text-3xl sm:text-4xl font-bold tracking-tight text-foreground",
            "placeholder:text-muted-foreground/30 focus:outline-none focus:ring-0",
            "disabled:opacity-75"
          )}
          aria-label="Page title"
        />
      </div>
    </div>
  );
}
