"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDown,
  Calendar,
  Check,
  ChevronsUp,
  Clock,
  Copy,
  Flame,
  Folder,
  Minus,
  MoreHorizontal,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteTaskAction,
  duplicateTaskAction,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function PriorityIcon({ priority }: { priority: TaskPriority }) {
  switch (priority) {
    case "urgent":
      return <Flame className="size-3.5 text-rose-500 shrink-0" />;
    case "high":
      return <ChevronsUp className="size-3.5 text-amber-500 shrink-0" />;
    case "medium":
      return <Minus className="size-3.5 text-blue-500 shrink-0" />;
    case "low":
    default:
      return <ArrowDown className="size-3.5 text-muted-foreground shrink-0" />;
  }
}

function StatusDot({ status }: { status: TaskStatus }) {
  switch (status) {
    case "completed":
      return <span className="size-2 rounded-full bg-emerald-500 shrink-0" />;
    case "in_progress":
      return <span className="size-2 rounded-full bg-blue-500 shrink-0" />;
    case "blocked":
      return <span className="size-2 rounded-full bg-amber-500 shrink-0" />;
    case "cancelled":
      return <span className="size-2 rounded-full bg-muted-foreground/40 shrink-0" />;
    case "todo":
    default:
      return <span className="size-2 rounded-full bg-muted-foreground/50 shrink-0" />;
  }
}

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
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card/40 shadow-xs">
      {/* Table Header — column widths match rows */}
      <div className="hidden items-center gap-3 border-b border-border/40 bg-muted/25 px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 sm:flex">
        <div className="w-5 shrink-0" />
        <div className="min-w-0 flex-1">Task</div>
        <div className="hidden w-32 shrink-0 lg:block">Project</div>
        <div className="hidden w-28 shrink-0 sm:block">Due</div>
        <div className="hidden w-24 shrink-0 md:block">Priority</div>
        <div className="hidden w-28 shrink-0 md:block">Status</div>
        <div className="hidden w-20 shrink-0 text-right sm:block">Assignees</div>
        <div className="w-8 shrink-0" />
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground/60 shadow-2xs mb-3">
            <Check className="size-5" />
          </div>
          <p className="text-sm font-medium text-foreground">No tasks to display</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Create a task or change your filters to see your work here.
          </p>
        </div>
      ) : (
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
                    "group flex min-h-12 items-center gap-3 px-3.5 py-2.5 transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30",
                    selected
                      ? "bg-primary/8 ring-1 ring-inset ring-primary/20"
                      : "hover:bg-muted/40 dark:hover:bg-muted/25",
                    completed && "opacity-65",
                    pending && pendingId === task.id && "opacity-50"
                  )}
                  style={
                    task.color
                      ? { borderLeft: `3px solid ${task.color}` }
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
                  {/* Checkbox */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 shrink-0 flex items-center justify-center"
                  >
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

                  {/* Title + Meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <TaskIconDisplay icon={task.icon} color={task.color} />
                      <p
                        className={cn(
                          "truncate text-[14px] font-medium leading-snug text-foreground/90 group-hover:text-foreground",
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

                  {/* Mobile-only secondary line */}
                  <div className="mt-1 flex flex-wrap items-center gap-2 sm:hidden">
                    {meta.length > 0 ? (
                      <span
                        className={cn(
                          "truncate text-[11px] text-muted-foreground",
                          dueOverdue && "font-semibold text-rose-500"
                        )}
                      >
                        {meta.join(" · ")}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px]",
                        softChipClass(TASK_PRIORITY_TONE[task.priority])
                      )}
                    >
                      {TASK_PRIORITY_LABELS[task.priority]}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px]",
                        softChipClass(TASK_STATUS_TONE[task.status])
                      )}
                    >
                      {TASK_STATUS_LABELS[task.status]}
                    </span>
                  </div>
                </div>

                {/* Project Column */}
                <div className="hidden w-32 shrink-0 items-center gap-1.5 truncate text-xs text-muted-foreground lg:flex">
                  {task.projectName ? (
                    <span className="truncate rounded-md bg-muted/70 px-1.5 py-0.5 text-[11px] font-medium text-foreground/80">
                      @{task.projectName}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/35">—</span>
                  )}
                </div>

                {/* Due Date Column */}
                <div className="hidden w-28 shrink-0 sm:flex items-center">
                  {task.dueAt ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium",
                        dueOverdue
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold"
                          : isToday(new Date(task.dueAt))
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                          : "text-muted-foreground"
                      )}
                    >
                      <Calendar className="size-3 shrink-0" />
                      <span className="truncate">
                        {dueOverdue ? "Overdue" : formatDueDate(task.dueAt)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground/35 text-[11px]">—</span>
                  )}
                </div>

                {/* Priority Column */}
                <div className="hidden w-24 shrink-0 md:flex items-center text-xs">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium",
                      softChipClass(TASK_PRIORITY_TONE[task.priority])
                    )}
                  >
                    <PriorityIcon priority={task.priority} />
                    <span>{TASK_PRIORITY_LABELS[task.priority]}</span>
                  </span>
                </div>

                {/* Status Column */}
                <div className="hidden w-28 shrink-0 md:flex items-center text-xs">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
                      softChipClass(TASK_STATUS_TONE[task.status])
                    )}
                  >
                    <StatusDot status={task.status} />
                    <span className="truncate">{TASK_STATUS_LABELS[task.status]}</span>
                  </span>
                </div>

                {/* Assignees Column */}
                <div className="hidden w-20 shrink-0 items-center justify-end -space-x-1.5 sm:flex">
                  {task.assignees && task.assignees.length > 0 ? (
                    task.assignees.slice(0, 2).map((a) => (
                      <Avatar
                        key={a.userId}
                        className="size-6 border border-background shadow-xs ring-1 ring-border/40"
                        title={a.name}
                      >
                        <AvatarFallback className="text-[9px] font-semibold bg-primary/10 text-primary">
                          {initials(a.name)}
                        </AvatarFallback>
                      </Avatar>
                    ))
                  ) : (
                    <span
                      className="size-5 rounded-full border border-dashed border-border/70 flex items-center justify-center opacity-30"
                      title="Unassigned"
                    >
                      <User className="size-2.5 text-muted-foreground" />
                    </span>
                  )}
                </div>

                {/* Actions Dropdown */}
                <div
                  className="w-8 shrink-0 flex items-center justify-end opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
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
                          className="size-7 rounded-md text-muted-foreground hover:text-foreground"
                          aria-label="Task actions"
                        />
                      }
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 text-xs">
                      <DropdownMenuItem onClick={() => openTask(task.id)}>
                        Edit details
                      </DropdownMenuItem>
                      <DropdownMenuItem
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
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              Set due date
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem
                                onClick={() =>
                                  setDue(task, new Date().toISOString())
                                }
                              >
                                Today
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  setDue(
                                    task,
                                    addDays(new Date(), 1).toISOString()
                                  )
                                }
                              >
                                Tomorrow
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  setDue(
                                    task,
                                    addDays(new Date(), 7).toISOString()
                                  )
                                }
                              >
                                Next week
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDue(task, null)}
                              >
                                Clear date
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        </>
                      ) : null}
                      {canDelete ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => removeTask(task)}
                          >
                            <Trash2 className="mr-2 size-3.5" /> Move to trash
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
      )}
    </div>
  );
}
