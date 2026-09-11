"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  Copy,
  MoreHorizontal,
  Play,
  Trash2,
} from "lucide-react";
import {
  deleteTaskAction,
  duplicateTaskAction,
  setTaskAssigneesAction,
  setTaskWatchersAction,
  updateTaskAction,
} from "@/modules/tasks/task.actions";
import type { ProjectRecord } from "@/modules/projects/project.types";
import {
  DURATION_PRESETS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_RECURRENCE_LABELS,
  TASK_RECURRENCE_OPTIONS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskRecord,
  type TaskRecurrence,
  type TaskStatus,
} from "@/modules/tasks/task.types";
import { formatDurationMinutes } from "@/modules/productivity/priority.service";
import { AssigneePicker } from "@/components/tasks/assignee-picker";
import { TaskAttachments } from "@/components/tasks/task-attachments";
import { TaskComments } from "@/components/tasks/task-comments";
import { TaskActivity } from "@/components/tasks/task-activity";
import { TaskSubtasks } from "@/components/tasks/task-subtasks";
import { TaskTagPicker } from "@/components/tasks/task-tag-picker";
import { TaskIconColor } from "@/components/tasks/task-icon-color";
import { useSuggestedSubtasks } from "@/components/productivity/suggested-subtasks";
import { TaskSection } from "@/components/tasks/task-section";
import {
  TaskPropertyRow,
} from "@/components/tasks/task-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type MemberOption = { userId: string; name: string; email: string };

function toLocalInput(date: Date | null | undefined) {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoOrNull(local: string) {
  if (!local) return null;
  const ms = Date.parse(local);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

function parseLocalDate(local: string): Date | undefined {
  if (!local) return undefined;
  const ms = Date.parse(local);
  if (Number.isNaN(ms)) return undefined;
  return new Date(ms);
}

function dateToLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T17:00`;
}

function formatDateDisplay(local: string) {
  const d = parseLocalDate(local);
  if (!d) return null;
  return format(d, "d MMM yyyy");
}

/** Borderless select trigger — SelectValue shows ItemText only (never raw codes). */
function PropertySelectTrigger({
  muted,
  className,
}: {
  muted?: boolean;
  className?: string;
}) {
  return (
    <SelectTrigger
      className={cn(
        "h-auto w-full min-w-0 justify-end gap-0 border-0 bg-transparent p-0 shadow-none",
        "focus:ring-0 focus-visible:border-transparent focus-visible:ring-0",
        "data-[popup-open]:bg-transparent [&_svg]:hidden",
        muted && "text-muted-foreground",
        className
      )}
    >
      <SelectValue
        className={cn(
          "justify-end text-right text-[14px]",
          muted ? "text-muted-foreground" : "text-foreground"
        )}
      />
    </SelectTrigger>
  );
}

function DatePropertyControl({
  value,
  disabled,
  onChange,
  onCommit,
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseLocalDate(value);
  const display = formatDateDisplay(value);

  if (disabled) {
    return (
      <span
        className={cn(
          "truncate text-right text-[14px]",
          display ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {display ?? "Not set"}
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "w-full truncate text-right text-[14px]",
              display ? "text-foreground" : "text-muted-foreground"
            )}
          />
        }
      >
        {display ?? "Not set"}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (!date) return;
            const next = dateToLocalInput(date);
            onChange(next);
            setOpen(false);
            onCommit(next);
          }}
        />
        <div className="border-t border-border/50 p-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-full text-muted-foreground"
            onClick={() => {
              onChange("");
              setOpen(false);
              onCommit("");
            }}
          >
            Clear date
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TaskDetail({
  workspaceId,
  workspaceSlug,
  task,
  projects,
  members,
  canEdit,
  canDelete,
  canCreate = false,
  canInvite = false,
  subtasks = [],
  variant = "page",
  currentUserId,
}: {
  workspaceId: string;
  workspaceSlug: string;
  task: TaskRecord;
  projects: ProjectRecord[];
  members: MemberOption[];
  canEdit: boolean;
  canDelete: boolean;
  canCreate?: boolean;
  canInvite?: boolean;
  subtasks?: TaskRecord[];
  variant?: "sheet" | "page";
  currentUserId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [projectId, setProjectId] = useState(task.projectId ?? "");
  const [icon, setIcon] = useState(task.icon ?? "");
  const [color, setColor] = useState(task.color ?? "");
  const [startAt, setStartAt] = useState(toLocalInput(task.startAt));
  const [dueAt, setDueAt] = useState(toLocalInput(task.dueAt));
  const [followUpAt, setFollowUpAt] = useState(toLocalInput(task.followUpAt));
  const [remindAt, setRemindAt] = useState(toLocalInput(task.remindAt));
  const [recurrence, setRecurrence] = useState<TaskRecurrence>(
    task.recurrenceRule ?? "none"
  );
  const [estimatedDuration, setEstimatedDuration] = useState<number | "">(
    task.estimatedDurationMinutes ?? ""
  );
  const [assigneeIds, setAssigneeIds] = useState(
    task.assignees.map((a) => a.userId)
  );
  const [watcherIds, setWatcherIds] = useState(
    (task.watchers ?? []).map((w) => w.userId)
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [descFocused, setDescFocused] = useState(false);
  const [appendedSubtasks, setAppendedSubtasks] = useState<TaskRecord[]>([]);

  const visibleSubtasks = useMemo(() => {
    const ids = new Set(subtasks.map((s) => s.id));
    return [
      ...subtasks,
      ...appendedSubtasks.filter((s) => !ids.has(s.id)),
    ];
  }, [subtasks, appendedSubtasks]);

  useEffect(() => {
    setAppendedSubtasks((prev) =>
      prev.filter((s) => !subtasks.some((p) => p.id === s.id))
    );
  }, [subtasks]);

  const suggested = useSuggestedSubtasks({
    workspaceId,
    workspaceSlug,
    taskId: task.id,
    title,
    description,
    canCreate: Boolean(canCreate || canEdit),
    onCreated: (tasks) =>
      setAppendedSubtasks((prev) => [...prev, ...tasks]),
  });

  function saveFields(patch: Record<string, unknown> = {}) {
    if (!canEdit) return;
    startTransition(async () => {
      setError(null);
      const result = await updateTaskAction({
        workspaceId,
        workspaceSlug,
        taskId: task.id,
        title,
        description: description || null,
        projectId: projectId || null,
        status,
        priority,
        icon: icon || null,
        color: color || null,
        startAt: toIsoOrNull(startAt),
        dueAt: toIsoOrNull(dueAt),
        followUpAt: toIsoOrNull(followUpAt),
        remindAt: toIsoOrNull(remindAt),
        recurrenceRule: recurrence,
        ...patch,
      });
      if (!result.success) {
        setError(result.error.message);
        toast.error(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  function saveAssignees(ids: string[]) {
    setAssigneeIds(ids);
    if (!canEdit) return;
    startTransition(async () => {
      const result = await setTaskAssigneesAction({
        workspaceId,
        workspaceSlug,
        taskId: task.id,
        assigneeIds: ids,
      });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  function saveWatchers(ids: string[]) {
    setWatcherIds(ids);
    if (!canEdit) return;
    startTransition(async () => {
      const result = await setTaskWatchersAction({
        workspaceId,
        workspaceSlug,
        taskId: task.id,
        watcherIds: ids,
      });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  const completed = status === "completed";

  const sidebar = (
    <aside className="space-y-1 md:sticky md:top-0 md:self-start">
      <div className="-mx-1">
        <TaskPropertyRow label="Project">
          <Select
            value={projectId || "__none"}
            disabled={!canEdit || pending}
            itemToStringLabel={(v) => {
              if (!v || v === "__none") return "Inbox";
              return projects.find((p) => p.id === v)?.name ?? "Project";
            }}
            onValueChange={(v) => {
              const next = v === "__none" || !v ? "" : String(v);
              setProjectId(next);
              saveFields({ projectId: next || null });
            }}
          >
            <PropertySelectTrigger muted={!projectId} />
            <SelectContent align="end">
              <SelectItem value="__none">Inbox</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TaskPropertyRow>

        <TaskPropertyRow label="Date">
          <DatePropertyControl
            value={dueAt}
            disabled={!canEdit || pending}
            onChange={setDueAt}
            onCommit={(next) => {
              setDueAt(next);
              saveFields({ dueAt: toIsoOrNull(next) });
            }}
          />
        </TaskPropertyRow>

        <TaskPropertyRow label="Priority">
          <Select
            value={priority}
            disabled={!canEdit || pending}
            itemToStringLabel={(v) =>
              TASK_PRIORITY_LABELS[v as TaskPriority] ?? "Priority"
            }
            onValueChange={(v) => {
              if (!v) return;
              setPriority(v as TaskPriority);
              saveFields({ priority: v });
            }}
          >
            <PropertySelectTrigger />
            <SelectContent align="end">
              {TASK_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {TASK_PRIORITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TaskPropertyRow>

        <TaskPropertyRow label="Status">
          <Select
            value={status}
            disabled={!canEdit || pending}
            itemToStringLabel={(v) =>
              TASK_STATUS_LABELS[v as TaskStatus] ?? "Status"
            }
            onValueChange={(v) => {
              if (!v) return;
              setStatus(v as TaskStatus);
              saveFields({ status: v });
            }}
          >
            <PropertySelectTrigger />
            <SelectContent align="end">
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {TASK_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TaskPropertyRow>

        <TaskPropertyRow label="Labels" interactive={false}>
          <div className="w-full text-left">
            <TaskTagPicker
              workspaceId={workspaceId}
              workspaceSlug={workspaceSlug}
              taskId={task.id}
              value={task.tags ?? []}
              canEdit={canEdit}
            />
          </div>
        </TaskPropertyRow>

        <TaskPropertyRow label="Assignees" interactive={canEdit}>
          <AssigneePicker
            members={members}
            value={assigneeIds}
            onChange={saveAssignees}
            disabled={!canEdit || pending}
            workspaceId={workspaceId}
            canInvite={canInvite}
            emptyLabel="Anyone"
            addLabel="Assign"
            compact
            inlineSummary
          />
        </TaskPropertyRow>

        <TaskPropertyRow label="Remind">
          <DatePropertyControl
            value={remindAt}
            disabled={!canEdit || pending}
            onChange={setRemindAt}
            onCommit={(next) => {
              setRemindAt(next);
              saveFields({ remindAt: toIsoOrNull(next) });
            }}
          />
        </TaskPropertyRow>

        {showAdvanced ? (
          <div className="animate-in fade-in-0 slide-in-from-top-1 duration-200">
            <TaskPropertyRow label="Estimate">
              <Select
                value={
                  estimatedDuration === ""
                    ? "__none"
                    : String(estimatedDuration)
                }
                disabled={!canEdit || pending}
                itemToStringLabel={(v) => {
                  if (!v || v === "__none") return "None";
                  return formatDurationMinutes(Number(v)) ?? "Estimate";
                }}
                onValueChange={(v) => {
                  if (!v || v === "__none") {
                    setEstimatedDuration("");
                    saveFields({ estimatedDurationMinutes: null });
                    return;
                  }
                  const minutes = Number(v);
                  setEstimatedDuration(minutes);
                  saveFields({ estimatedDurationMinutes: minutes });
                }}
              >
                <PropertySelectTrigger muted={estimatedDuration === ""} />
                <SelectContent align="end">
                  <SelectItem value="__none">None</SelectItem>
                  {DURATION_PRESETS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {formatDurationMinutes(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TaskPropertyRow>
            <TaskPropertyRow label="Repeat">
              <Select
                value={recurrence}
                disabled={!canEdit || pending}
                itemToStringLabel={(v) =>
                  TASK_RECURRENCE_LABELS[v as TaskRecurrence] ?? "Repeat"
                }
                onValueChange={(v) => {
                  if (!v) return;
                  setRecurrence(v as TaskRecurrence);
                  saveFields({ recurrenceRule: v });
                }}
              >
                <PropertySelectTrigger muted={recurrence === "none"} />
                <SelectContent align="end">
                  {TASK_RECURRENCE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {TASK_RECURRENCE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TaskPropertyRow>
            <TaskPropertyRow label="Start">
              <DatePropertyControl
                value={startAt}
                disabled={!canEdit || pending}
                onChange={setStartAt}
                onCommit={(next) => {
                  setStartAt(next);
                  saveFields({ startAt: toIsoOrNull(next) });
                }}
              />
            </TaskPropertyRow>
            <TaskPropertyRow label="Follow-up">
              <DatePropertyControl
                value={followUpAt}
                disabled={!canEdit || pending}
                onChange={setFollowUpAt}
                onCommit={(next) => {
                  setFollowUpAt(next);
                  saveFields({ followUpAt: toIsoOrNull(next) });
                }}
              />
            </TaskPropertyRow>
            <TaskPropertyRow label="Watching" interactive={canEdit}>
              <AssigneePicker
                members={members}
                value={watcherIds}
                onChange={saveWatchers}
                disabled={!canEdit || pending}
                emptyLabel="None"
                addLabel="Add"
                compact
                inlineSummary
              />
            </TaskPropertyRow>
          </div>
        ) : null}

        <button
          type="button"
          className="mt-1 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[12px] text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform duration-200",
              showAdvanced && "rotate-180"
            )}
          />
          {showAdvanced ? "Less" : "More"}
        </button>
      </div>

      <div className="pt-3">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-full justify-start gap-1.5 px-2 text-[13px] text-muted-foreground"
          render={<Link href={`/w/${workspaceSlug}/focus/${task.id}`} />}
        >
          <Play className="size-3.5" />
          Start focus
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(12rem,15rem)] md:items-start">
        <div className="min-w-0 space-y-5">
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              {canEdit ? (
                <button
                  type="button"
                  className={cn(
                    "mt-1.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border-strong transition-colors",
                    completed && "border-success bg-success text-success-foreground"
                  )}
                  aria-label={completed ? "Mark incomplete" : "Mark complete"}
                  disabled={pending}
                  onClick={() => {
                    const next = completed ? "todo" : "completed";
                    setStatus(next);
                    saveFields({ status: next });
                  }}
                >
                  {completed ? <Check className="size-3" /> : null}
                </button>
              ) : null}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-start gap-2">
                  <TaskIconColor
                    workspaceId={workspaceId}
                    icon={icon}
                    color={color}
                    compact
                    disabled={!canEdit || pending}
                    onIconChange={(v) => {
                      setIcon(v);
                      saveFields({ icon: v || null });
                    }}
                    onColorChange={(v) => {
                      setColor(v);
                      saveFields({ color: v || null });
                    }}
                  />
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => saveFields({ title })}
                    disabled={!canEdit || pending}
                    className={cn(
                      "h-auto min-h-9 min-w-0 flex-1 border-0 bg-transparent px-0 py-0.5 text-[1.35rem] font-semibold leading-snug tracking-tight shadow-none focus-visible:ring-0",
                      completed && "text-muted-foreground line-through"
                    )}
                    aria-label="Task title"
                  />
                </div>
                {variant === "page" ? (
                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            className="size-8 text-muted-foreground"
                            aria-label="More actions"
                          />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
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
                          <Copy className="size-3.5" /> Duplicate
                        </DropdownMenuItem>
                        {canDelete ? (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteOpen(true)}
                          >
                            <Trash2 className="size-3.5" /> Delete
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : null}
              </div>
            </div>

            <Textarea
              value={description}
              rows={descFocused || description ? 3 : 1}
              disabled={!canEdit || pending}
              onChange={(e) => setDescription(e.target.value)}
              onFocus={() => setDescFocused(true)}
              onBlur={() => {
                setDescFocused(false);
                saveFields({ description: description || null });
              }}
              placeholder="Description"
              className={cn(
                "min-h-8 resize-none border-0 bg-transparent px-0 text-[14px] leading-relaxed shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0",
                description || descFocused
                  ? "text-foreground/90"
                  : "text-muted-foreground",
                descFocused && "min-h-[5rem]"
              )}
            />
          </div>

          <TaskSection
            title="Sub-tasks"
            className="border-t border-border/50 pt-4"
            action={suggested.action}
          >
            {suggested.panel}
            <TaskSubtasks
              workspaceId={workspaceId}
              workspaceSlug={workspaceSlug}
              parentTaskId={task.id}
              canEdit={canEdit}
              canCreate={canCreate || canEdit}
              initial={visibleSubtasks}
            />
          </TaskSection>

          <TaskSection title="Files" className="border-t border-border/50 pt-4">
            <TaskAttachments
              workspaceId={workspaceId}
              workspaceSlug={workspaceSlug}
              taskId={task.id}
              canEdit={canEdit}
            />
          </TaskSection>

          <div className="border-t border-border/50 pt-4">
            <TaskComments
              workspaceId={workspaceId}
              workspaceSlug={workspaceSlug}
              taskId={task.id}
              canComment={canEdit}
              currentUserId={currentUserId}
            />
          </div>

          <TaskSection title="Activity" className="border-t border-border/50 pt-4">
            <TaskActivity workspaceId={workspaceId} taskId={task.id} />
          </TaskSection>

          {pending ? (
            <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Spinner className="size-3" /> Saving…
            </p>
          ) : null}
        </div>

        <div className="border-t border-border/40 pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
          {sidebar}
        </div>
      </div>

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
                startTransition(async () => {
                  const result = await deleteTaskAction({
                    workspaceId,
                    workspaceSlug,
                    taskId: task.id,
                  });
                  if (!result.success) {
                    toast.error(result.error.message);
                    return;
                  }
                  toast.success("Task deleted");
                  router.push(`/w/${workspaceSlug}/tasks`);
                  router.refresh();
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
