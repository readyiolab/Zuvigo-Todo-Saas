"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  deleteTaskAction,
  setTaskAssigneesAction,
  updateTaskAction,
} from "@/modules/tasks/task.actions";
import type { ProjectRecord } from "@/modules/projects/project.types";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskRecord,
  type TaskStatus,
} from "@/modules/tasks/task.types";
import {
  softChipClass,
  TASK_PRIORITY_TONE,
  TASK_STATUS_TONE,
} from "@/components/shared/status-styles";
import { TaskCheckbox } from "@/components/tasks/task-checkbox";
import { TaskIconDisplay } from "@/components/tasks/task-icon-display";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDueDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { addDays, isPast, isToday, startOfDay } from "date-fns";
import { recommendDoNext } from "@/modules/productivity/priority.service";
import { formatDurationMinutes } from "@/modules/productivity/priority.service";

type MemberOption = { userId: string; name: string; email: string };

export function TaskList({
  workspaceId,
  workspaceSlug,
  tasks: initialTasks,
  projects = [],
  members = [],
  canComplete,
  canEdit,
  canDelete,
  selectedTaskId,
  onOpenTask,
}: {
  workspaceId: string;
  workspaceSlug: string;
  tasks: TaskRecord[];
  projects?: ProjectRecord[];
  members?: MemberOption[];
  canComplete?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  selectedTaskId?: string;
  onOpenTask?: (taskId: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tasks, setOptimistic] = useOptimistic(initialTasks);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const recommendedId =
    recommendDoNext(
      tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled")
    )?.task.id ?? null;

  function openTask(taskId: string) {
    if (onOpenTask) {
      onOpenTask(taskId);
      return;
    }
    router.push(`/w/${workspaceSlug}/tasks/${taskId}`);
  }

  function patchTask(
    task: TaskRecord,
    patch: Partial<TaskRecord> & Record<string, unknown>,
    action: () => Promise<{ success: boolean; error?: { message: string } }>
  ) {
    const nextList = tasks.map((t) =>
      t.id === task.id ? { ...t, ...patch } : t
    );
    startTransition(async () => {
      setPendingId(task.id);
      setOptimistic(nextList);
      const result = await action();
      setPendingId(null);
      if (!result.success) {
        toast.error(result.error?.message ?? "Something went wrong");
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  function toggleComplete(task: TaskRecord) {
    if (!canComplete) return;
    const nextStatus: TaskStatus =
      task.status === "completed" ? "todo" : "completed";
    patchTask(task, { status: nextStatus }, () =>
      updateTaskAction({
        workspaceId,
        workspaceSlug,
        taskId: task.id,
        status: nextStatus,
      })
    );
  }

  function setStatus(task: TaskRecord, status: TaskStatus) {
    if (!canEdit) return;
    patchTask(task, { status }, () =>
      updateTaskAction({
        workspaceId,
        workspaceSlug,
        taskId: task.id,
        status,
      })
    );
  }

  function setPriority(task: TaskRecord, priority: TaskPriority) {
    if (!canEdit) return;
    patchTask(task, { priority }, () =>
      updateTaskAction({
        workspaceId,
        workspaceSlug,
        taskId: task.id,
        priority,
      })
    );
  }

  function setDue(task: TaskRecord, dueAt: string | null) {
    if (!canEdit) return;
    patchTask(
      task,
      { dueAt: dueAt ? new Date(dueAt) : null },
      () =>
        updateTaskAction({
          workspaceId,
          workspaceSlug,
          taskId: task.id,
          dueAt,
        })
    );
  }

  function setProject(task: TaskRecord, projectId: string | null) {
    if (!canEdit) return;
    const projectName =
      projects.find((p) => p.id === projectId)?.name ?? null;
    patchTask(task, { projectId, projectName }, () =>
      updateTaskAction({
        workspaceId,
        workspaceSlug,
        taskId: task.id,
        projectId,
      })
    );
  }

  function assignTo(task: TaskRecord, userId: string) {
    if (!canEdit) return;
    const ids = task.assignees.map((a) => a.userId);
    const next = ids.includes(userId)
      ? ids.filter((id) => id !== userId)
      : [...ids, userId];
    startTransition(async () => {
      setPendingId(task.id);
      const result = await setTaskAssigneesAction({
        workspaceId,
        workspaceSlug,
        taskId: task.id,
        assigneeIds: next,
      });
      setPendingId(null);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  function removeTask(task: TaskRecord) {
    if (!canDelete) return;
    startTransition(async () => {
      setPendingId(task.id);
      try {
        const result = await deleteTaskAction({
          workspaceId,
          workspaceSlug,
          taskId: task.id,
        });
        if (result && !result.success) {
          toast.error(result.error.message);
          setPendingId(null);
          return;
        }
      } catch {
        // redirect throws in Next server actions
      }
      toast.success("Task deleted");
      router.refresh();
    });
  }

  return (
    <ul className="divide-y divide-border/30">
      {tasks.map((task) => {
        const completed = task.status === "completed";
        const selected = selectedTaskId === task.id;
        const dueOverdue =
          Boolean(task.dueAt) &&
          !completed &&
          isPast(startOfDay(new Date(task.dueAt!))) &&
          !isToday(new Date(task.dueAt!));
        const meta = [
          task.dueAt
            ? dueOverdue
              ? `Overdue · ${formatDueDate(task.dueAt)}`
              : formatDueDate(task.dueAt)
            : null,
          task.projectName,
        ].filter(Boolean);

        return (
          <li key={task.id}>
            <div
              role="button"
              tabIndex={0}
              className={cn(
                "group flex min-h-12 items-center gap-3 px-2 py-3 transition-colors sm:min-h-14 sm:px-3",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30",
                selected
                  ? "bg-muted/50 hover:bg-muted/50 focus-visible:bg-muted/50"
                  : "hover:bg-muted/40 focus-visible:bg-muted/45",
                completed && "opacity-90",
                pending && pendingId === task.id && "opacity-60"
              )}
              style={
                task.color
                  ? { boxShadow: `inset 3px 0 0 0 ${task.color}` }
                  : undefined
              }
              onClick={() => openTask(task.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  openTask(task.id);
                }
                if (e.key === " " && canComplete) {
                  e.preventDefault();
                  toggleComplete(task);
                }
              }}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <TaskCheckbox
                  checked={completed}
                  disabled={!canComplete}
                  pending={pendingId === task.id}
                  label={
                    completed
                      ? `Mark "${task.title}" not done`
                      : `Mark "${task.title}" done`
                  }
                  onCheckedChange={() => toggleComplete(task)}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <TaskIconDisplay icon={task.icon} color={task.color} />
                  <p
                    className={cn(
                      "truncate text-[15px] font-medium leading-snug",
                      completed && "text-muted-foreground line-through"
                    )}
                  >
                    {task.title}
                  </p>
                  {recommendedId === task.id && !completed ? (
                    <span className="shrink-0 rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      Do next
                    </span>
                  ) : null}
                  {formatDurationMinutes(task.estimatedDurationMinutes) ? (
                    <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">
                      {formatDurationMinutes(task.estimatedDurationMinutes)}
                    </span>
                  ) : null}
                </div>
                {meta.length > 0 ? (
                  <p
                    className={cn(
                      "mt-0.5 truncate text-[12px] text-muted-foreground sm:mt-1",
                      dueOverdue && "font-medium text-destructive"
                    )}
                  >
                    {meta.join(" · ")}
                  </p>
                ) : null}
                <div className="mt-1.5 flex flex-wrap gap-1.5 md:hidden">
                  <span
                    className={softChipClass(TASK_PRIORITY_TONE[task.priority])}
                  >
                    {TASK_PRIORITY_LABELS[task.priority]}
                  </span>
                  <span
                    className={softChipClass(TASK_STATUS_TONE[task.status])}
                  >
                    {TASK_STATUS_LABELS[task.status]}
                  </span>
                </div>
              </div>

              <div className="hidden shrink-0 items-center gap-2 md:flex">
                <span
                  className={softChipClass(TASK_PRIORITY_TONE[task.priority])}
                >
                  {TASK_PRIORITY_LABELS[task.priority]}
                </span>
                <span className={softChipClass(TASK_STATUS_TONE[task.status])}>
                  {TASK_STATUS_LABELS[task.status]}
                </span>
              </div>

              <div
                className="shrink-0 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="size-8 text-muted-foreground"
                        aria-label="Task actions"
                      />
                    }
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => openTask(task.id)}>
                      Edit
                    </DropdownMenuItem>
                    {canEdit ? (
                      <>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            Change status
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {TASK_STATUSES.map((s) => (
                              <DropdownMenuItem
                                key={s}
                                onClick={() => setStatus(task, s)}
                              >
                                {TASK_STATUS_LABELS[s]}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            Change priority
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {TASK_PRIORITIES.map((p) => (
                              <DropdownMenuItem
                                key={p}
                                onClick={() => setPriority(task, p)}
                              >
                                {TASK_PRIORITY_LABELS[p]}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        {members.length > 0 ? (
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              Assign
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
                              {members.map((m) => {
                                const assigned = task.assignees.some(
                                  (a) => a.userId === m.userId
                                );
                                return (
                                  <DropdownMenuItem
                                    key={m.userId}
                                    onClick={() => assignTo(task, m.userId)}
                                  >
                                    {assigned ? "✓ " : ""}
                                    {m.name}
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        ) : null}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            Set due date
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem
                              onClick={() =>
                                setDue(task, addDays(new Date(), 0).toISOString())
                              }
                            >
                              Today
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setDue(task, addDays(new Date(), 1).toISOString())
                              }
                            >
                              Tomorrow
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDue(task, null)}
                            >
                              Clear due date
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        {projects.length > 0 ? (
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              Move to project
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
                              <DropdownMenuItem
                                onClick={() => setProject(task, null)}
                              >
                                No project
                              </DropdownMenuItem>
                              {projects.map((p) => (
                                <DropdownMenuItem
                                  key={p.id}
                                  onClick={() => setProject(task, p.id)}
                                >
                                  {p.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        ) : null}
                      </>
                    ) : null}
                    {canDelete ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => removeTask(task)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
