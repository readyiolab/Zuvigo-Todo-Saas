"use client";

import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { ChevronDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  createCommentAction,
  deleteCommentAction,
  listCommentsAction,
  updateCommentAction,
} from "@/modules/comments/comment.actions";
import { CommentComposer } from "@/components/tasks/comment-composer";
import { MentionText } from "@/components/mentions/mention-text";
import {
  CommentAudioPlayer,
  FilePreviewCard,
  filePreviewKind,
} from "@/components/tasks/file-preview-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CommentMention } from "@/lib/mention-helpers";

type CommentAttachment = {
  id: string;
  fileId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  downloadUrl?: string | null;
};

type Comment = {
  id: string;
  body: string;
  authorUserId: string;
  authorName: string;
  createdAt: string | Date;
  attachments?: CommentAttachment[];
  mentions?: CommentMention[];
};

type MemberOption = { userId: string; name: string; email: string };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function friendlyDate(value: string | Date) {
  try {
    return format(new Date(value), "d MMM · h:mm a");
  } catch {
    return "";
  }
}

export function TaskComments({
  workspaceId,
  workspaceSlug,
  taskId,
  canComment,
  currentUserId,
  members = [],
  hideHeader = false,
  onCountChange,
}: {
  workspaceId: string;
  workspaceSlug: string;
  taskId: string;
  canComment: boolean;
  currentUserId?: string;
  members?: MemberOption[];
  /** Hide the collapsible header (used when embedded inside a tab) */
  hideHeader?: boolean;
  onCountChange?: (count: number) => void;
}) {
  const [items, setItems] = useState<Comment[]>([]);
  const [open, setOpen] = useState(true);
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  function refresh() {
    startTransition(async () => {
      const result = await listCommentsAction({
        workspaceId,
        targetType: "task",
        targetId: taskId,
      });
      setLoading(false);
      if (!result.success || !result.data) return;
      const comments = (result.data as { comments: Comment[] }).comments;
      setItems(comments);
    });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, workspaceId]);

  useEffect(() => {
    onCountChange?.(items.length);
  }, [items.length, onCountChange]);

  async function submitComment(input: {
    body: string;
    fileIds: string[];
    mentions: CommentMention[];
  }): Promise<boolean> {
    const result = await createCommentAction({
      workspaceId,
      workspaceSlug,
      targetType: "task",
      targetId: taskId,
      body: input.body,
      fileIds: input.fileIds,
      mentions: input.mentions,
    });
    if (!result.success) {
      toast.error(result.error.message);
      return false;
    }
    const comment = (result.data as { comment: Comment } | undefined)?.comment;
    if (comment) {
      setItems((prev) => [...prev, comment]);
    } else {
      refresh();
    }
    return true;
  }

  function saveEdit(commentId: string) {
    if (!editBody.trim()) return;
    startTransition(async () => {
      const result = await updateCommentAction({
        workspaceId,
        workspaceSlug,
        commentId,
        body: editBody.trim(),
        targetType: "task",
        targetId: taskId,
      });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      const comment = (result.data as { comment: Comment } | undefined)?.comment;
      if (comment) {
        setItems((prev) =>
          prev.map((c) => (c.id === commentId ? comment : c))
        );
      }
      setEditingId(null);
    });
  }

  function remove(commentId: string) {
    startTransition(async () => {
      const result = await deleteCommentAction({
        workspaceId,
        workspaceSlug,
        commentId,
        targetType: "task",
        targetId: taskId,
      });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      setItems((prev) => prev.filter((c) => c.id !== commentId));
    });
  }

  const showBody = hideHeader || open;

  return (
    <div className="space-y-4">
      {!hideHeader ? (
        <button
          type="button"
          className="flex w-full items-center gap-2 text-left text-sm font-semibold tracking-tight text-foreground"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span>Comments</span>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            {items.length}
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
      ) : null}

      {showBody ? (
        <div className="space-y-4">
          {loading ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Spinner className="size-3" /> Loading…
            </p>
          ) : items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
              No comments yet. Start the conversation below.
            </p>
          ) : (
            <ul className="space-y-4">
              {items.map((c) => {
                const isOwn =
                  currentUserId != null && c.authorUserId === currentUserId;
                const bodyText = c.body?.trim() === "" ? "" : c.body;
                return (
                  <li key={c.id} className="group/comment flex gap-2.5">
                    <Avatar size="sm" className="mt-0.5 size-7 shrink-0">
                      <AvatarFallback className="text-[9px] font-medium">
                        {initials(c.authorName || "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-baseline gap-x-2">
                        <span className="text-[13px] font-medium">
                          {c.authorName || "Someone"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {friendlyDate(c.createdAt)}
                        </span>
                        {isOwn && canComment ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  size="icon-xs"
                                  variant="ghost"
                                  className="ml-auto size-6 opacity-0 group-hover/comment:opacity-100"
                                  aria-label="Comment actions"
                                />
                              }
                            >
                              <MoreHorizontal className="size-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingId(c.id);
                                  setEditBody(bodyText);
                                }}
                              >
                                <Pencil className="size-3.5" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => remove(c.id)}
                              >
                                <Trash2 className="size-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>

                      {editingId === c.id ? (
                        <div className="mt-1.5 space-y-2">
                          <Textarea
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            rows={3}
                            className="min-h-16 resize-none text-[13px]"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="xs"
                              disabled={pending || !editBody.trim()}
                              onClick={() => saveEdit(c.id)}
                            >
                              Save
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : bodyText ? (
                        <MentionText
                          body={bodyText}
                          mentions={c.mentions ?? []}
                          workspaceSlug={workspaceSlug}
                          className="mt-1 text-[13px] leading-relaxed text-foreground/90"
                        />
                      ) : null}

                      {(c.attachments ?? []).map((a) => {
                        const kind = filePreviewKind(
                          a.contentType,
                          a.filename
                        );
                        if (kind === "audio" && a.downloadUrl) {
                          return (
                            <CommentAudioPlayer
                              key={a.id}
                              src={a.downloadUrl}
                              filename={a.filename}
                            />
                          );
                        }
                        return (
                          <div key={a.id} className="mt-2">
                            <FilePreviewCard
                              filename={a.filename}
                              contentType={a.contentType}
                              sizeBytes={a.sizeBytes}
                              url={a.downloadUrl}
                              status="ready"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {canComment ? (
            <div className="sticky bottom-0 border-t border-border/40 bg-background pt-3">
              <CommentComposer
                workspaceId={workspaceId}
                disabled={!canComment}
                pending={pending}
                members={members}
                onSubmit={submitComment}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
