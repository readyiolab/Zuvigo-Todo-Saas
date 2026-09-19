"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Maximize2, MoreHorizontal, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  deleteTaskAction,
  duplicateTaskAction,
} from "@/modules/tasks/task.actions";
import type { ProjectRecord } from "@/modules/projects/project.types";
import type { TaskRecord } from "@/modules/tasks/task.types";
import { TaskDetail } from "@/components/tasks/task-detail";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

type MemberOption = { userId: string; name: string; email: string };

export function TaskDetailSheet({
  open,
  task,
  subtasks = [],
  workspaceId,
  workspaceSlug,
  projects,
  members,
  canEdit,
  canDelete,
  canCreate = false,
  canInvite = false,
  onOpenChange,
  currentUserId,
}: {
  open: boolean;
  task: TaskRecord | null;
  subtasks?: TaskRecord[];
  workspaceId: string;
  workspaceSlug: string;
  projects: ProjectRecord[];
  members: MemberOption[];
  canEdit: boolean;
  canDelete: boolean;
  canCreate?: boolean;
  canInvite?: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const projectName =
    task?.projectName ||
    (task?.projectId
      ? projects.find((p) => p.id === task.projectId)?.name
      : null) ||
    null;

  function close() {
    onOpenChange(false);
    const params = new URLSearchParams(window.location.search);
    params.delete("taskId");
    const qs = params.toString();
    router.replace(`/w/${workspaceSlug}/tasks${qs ? `?${qs}` : ""}`, {
      scroll: false,
    });
  }

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          if (!next) {
            const params = new URLSearchParams(window.location.search);
            params.delete("taskId");
            const qs = params.toString();
            router.replace(
              `/w/${workspaceSlug}/tasks${qs ? `?${qs}` : ""}`,
              { scroll: false }
            );
          }
        }}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          className="flex w-full flex-col gap-0 border-l border-border bg-background p-0 shadow-2xl transition-all sm:max-w-xl md:max-w-2xl"
        >
          <SheetTitle className="sr-only">{task?.title || "Task"}</SheetTitle>

          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-5 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-xs font-semibold text-foreground">
                Task Details
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="truncate rounded-md bg-muted/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {projectName ? projectName : "Inbox"}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {task ? (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Open as full page"
                  title="Open full page"
                  render={<Link href={`/w/${workspaceSlug}/tasks/${task.id}`} />}
                >
                  <Maximize2 className="size-4" />
                </Button>
              ) : null}

              {task ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="More actions"
                        disabled={pending}
                      />
                    }
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 text-xs shadow-md">
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => {
                        startTransition(async () => {
                          const result = await duplicateTaskAction({
                            workspaceId,
                            workspaceSlug,
                            taskId: task.id,
                          });
                          if (!result.success)
                            toast.error(result.error.message);
                          else toast.success("Task duplicated");
                        });
                      }}
                    >
                      <Copy className="mr-2 size-3.5" /> Duplicate task
                    </DropdownMenuItem>
                    {canDelete ? (
                      <DropdownMenuItem
                        variant="destructive"
                        className="cursor-pointer"
                        onClick={() => setDeleteOpen(true)}
                      >
                        <Trash2 className="mr-2 size-3.5" /> Delete task
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}

              <SheetClose
                render={
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Close"
                  />
                }
              >
                <X className="size-4" />
              </SheetClose>
            </div>
          </header>

          <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
            {task ? (
              <TaskDetail
                key={`${task.id}-${task.updatedAt}`}
                workspaceId={workspaceId}
                workspaceSlug={workspaceSlug}
                task={task}
                projects={projects}
                members={members}
                canEdit={canEdit}
                canDelete={canDelete}
                canCreate={canCreate}
                canInvite={canInvite}
                subtasks={subtasks}
                variant="sheet"
                currentUserId={currentUserId}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This moves the task to trash. You can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!task) return;
                startTransition(async () => {
                  try {
                    const result = await deleteTaskAction({
                      workspaceId,
                      workspaceSlug,
                      taskId: task.id,
                    });
                    if (result && !result.success) {
                      toast.error(result.error.message);
                      return;
                    }
                  } catch {
                    // redirect may throw
                  }
                  toast.success("Task deleted");
                  setDeleteOpen(false);
                  close();
                  router.refresh();
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
