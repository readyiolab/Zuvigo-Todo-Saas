"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Eye,
  Flame,
  Folder,
  History,
  MessageSquare,
  Minus,
  MoreHorizontal,
  Play,
  Repeat,
  Tag,
  Trash2,
  Users,
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
import { TaskPropertyRow } from "@/components/tasks/task-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
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

/** Status dot (span-based, not SVG, to avoid [&_svg]:hidden) */
function StatusDotInline({ status }: { status: TaskStatus }) {
  const color =
    status === "completed" ? "bg-emerald-500"
    : status === "in_progress" ? "bg-blue-500"
    : status === "blocked" ? "bg-amber-500"
    : status === "cancelled" ? "bg-muted-foreground/40"
    : "bg-muted-foreground/50";
  return <span className={cn("size-2 rounded-full shrink-0", color)} />;
}

function PriorityDotInline({ priority }: { priority: TaskPriority }) {
  const color =
    priority === "urgent" ? "bg-rose-500"
    : priority === "high" ? "bg-amber-500"
    : priority === "medium" ? "bg-blue-500"
    : "bg-muted-foreground/50";
  return <span className={cn("size-2 rounded-full shrink-0", color)} />;
}

function PropertySelectTrigger({
  muted,
  className,
  children,
}: {
  muted?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <SelectTrigger
      className={cn(
        "h-7 w-auto min-w-0 max-w-full justify-start gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2.5 py-0.5 text-xs font-medium transition-colors",
        "hover:border-border hover:bg-muted/60 focus:ring-0 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20",
        "data-[popup-open]:border-primary data-[popup-open]:bg-muted/70",
        "[&>[data-slot=select-value]]:truncate [&>[data-slot=select-value]]:text-left [&_svg]:opacity-60",
        muted ? "text-muted-foreground" : "text-foreground",
        className
      )}
    >
      {children ?? <SelectValue className="truncate text-left text-xs font-medium" />}
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
          "truncate text-left text-xs font-medium px-2.5 py-0.5",
          display ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {display ?? "No due date"}
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
              "inline-flex h-7 items-center justify-start gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2.5 py-0.5 text-xs font-medium transition-colors hover:border-border hover:bg-muted/60",
              display ? "text-foreground" : "text-muted-foreground"
            )}
          />
        }
      >
        <Calendar className="size-3 text-muted-foreground/70 shrink-0" />
        <span>{display ?? "Set due date"}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0 shadow-lg">
        <CalendarPicker
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
        <div className="flex items-center gap-1 border-t border-border/50 p-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs font-normal text-muted-foreground hover:text-foreground"
            onClick={() => {
              const today = new Date();
              const next = dateToLocalInput(today);
              onChange(next);
              setOpen(false);
              onCommit(next);
            }}
          >
            Today
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs font-normal text-muted-foreground hover:text-foreground"
            onClick={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              const next = dateToLocalInput(tomorrow);
              onChange(next);
              setOpen(false);
              onCommit(next);
            }}
          >
            Tomorrow
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ml-auto h-7 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => {
              onChange("");
              setOpen(false);
              onCommit("");
            }}
          >
            Clear
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
  const [commentCount, setCommentCount] = useState(0);

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
  const subtasksTotal = visibleSubtasks.length;
  const subtasksCompleted = visibleSubtasks.filter(
    (s) => s.status === "completed"
  ).length;
  const subtasksPercent =
    subtasksTotal > 0
      ? Math.round((subtasksCompleted / subtasksTotal) * 100)
      : 0;

  const propertiesCard = (
    <div className="rounded-xl border border-border bg-card p-2.5 shadow-2xs">
      <div className="flex flex-col gap-0.5">
        {/* Status */}
        <TaskPropertyRow
          label="Status"
          icon={<CheckCircle2 className="size-4" />}
        >
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
            <PropertySelectTrigger>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                <StatusDotInline status={status} />
                {TASK_STATUS_LABELS[status]}
              </span>
            </PropertySelectTrigger>
            <SelectContent align="start">
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {TASK_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TaskPropertyRow>

        {/* Due Date */}
        <TaskPropertyRow
          label="Due Date"
          icon={<Calendar className="size-4" />}
        >
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

        {/* Priority */}
        <TaskPropertyRow
          label="Priority"
          icon={<Flame className="size-4 text-amber-500" />}
        >
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
            <PropertySelectTrigger>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                <PriorityDotInline priority={priority} />
                {TASK_PRIORITY_LABELS[priority]}
              </span>
            </PropertySelectTrigger>
            <SelectContent align="start">
              {TASK_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {TASK_PRIORITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TaskPropertyRow>

        {/* Project */}
        <TaskPropertyRow
          label="Project"
          icon={<Folder className="size-4" />}
        >
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
            <PropertySelectTrigger muted={!projectId}>
              <span className="truncate text-xs font-medium">
                {projectId
                  ? (projects.find((p) => p.id === projectId)?.name ?? "Project")
                  : "Inbox"}
              </span>
            </PropertySelectTrigger>
            <SelectContent align="start">
              <SelectItem value="__none">Inbox</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TaskPropertyRow>

        {/* Assignees */}
        <TaskPropertyRow
          label="Assignee"
          icon={<Users className="size-4" />}
          interactive={canEdit}
        >
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

        {/* Tags */}
        <TaskPropertyRow
          label="Labels"
          icon={<Tag className="size-4" />}
          interactive={false}
        >
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
      </div>

      {/* Collapsible Advanced Properties */}
      {showAdvanced ? (
        <div className="mt-1 space-y-0.5 border-t border-border/40 pt-1 animate-in fade-in-0 slide-in-from-top-1 duration-150">
          <div className="flex flex-col gap-0.5">
            <TaskPropertyRow
              label="Estimate"
              icon={<Clock className="size-4" />}
            >
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
                <PropertySelectTrigger muted={estimatedDuration === ""}>
                  <span className="truncate text-xs font-medium">
                    {estimatedDuration === ""
                      ? "None"
                      : (formatDurationMinutes(Number(estimatedDuration)) ?? "None")}
                  </span>
                </PropertySelectTrigger>
                <SelectContent align="start">
                  <SelectItem value="__none">None</SelectItem>
                  {DURATION_PRESETS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {formatDurationMinutes(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TaskPropertyRow>

            <TaskPropertyRow
              label="Repeat"
              icon={<Repeat className="size-4" />}
            >
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
                <PropertySelectTrigger muted={recurrence === "none"}>
                  <span className="truncate text-xs font-medium">
                    {TASK_RECURRENCE_LABELS[recurrence]}
                  </span>
                </PropertySelectTrigger>
                <SelectContent align="start">
                  {TASK_RECURRENCE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {TASK_RECURRENCE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TaskPropertyRow>

            <TaskPropertyRow
              label="Start date"
              icon={<Calendar className="size-4" />}
            >
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

            <TaskPropertyRow
              label="Remind"
              icon={<Clock className="size-4" />}
            >
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

            <TaskPropertyRow
              label="Follow-up"
              icon={<Calendar className="size-4" />}
            >
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

            <TaskPropertyRow
              label="Watching"
              icon={<Eye className="size-4" />}
              interactive={canEdit}
            >
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
        </div>
      ) : null}

      <button
        type="button"
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md py-1 text-center text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        onClick={() => setShowAdvanced((v) => !v)}
      >
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform duration-200",
            showAdvanced && "rotate-180"
          )}
        />
        {showAdvanced ? "Fewer options" : "More options (Repeat, Reminders…)"}
      </button>
    </div>
  );

  const titleRow = (
    <div className="flex items-start gap-3">
      {canEdit ? (
        <button
          type="button"
          className={cn(
            "mt-1 flex size-6 shrink-0 items-center justify-center rounded-lg border transition-all duration-150",
            completed
              ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
              : "border-border-strong bg-background hover:border-emerald-500/80 hover:bg-emerald-500/10 text-transparent"
          )}
          aria-label={completed ? "Mark incomplete" : "Mark complete"}
          disabled={pending}
          onClick={() => {
            const next = completed ? "todo" : "completed";
            setStatus(next);
            saveFields({ status: next });
          }}
        >
          <Check
            className={cn(
              "size-3.5 stroke-[3] transition-transform",
              completed ? "scale-100" : "scale-50"
            )}
          />
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
            placeholder="Task title…"
            className={cn(
              "h-auto min-h-9 min-w-0 flex-1 border-0 bg-transparent px-0 py-0.5 text-xl font-semibold leading-snug tracking-tight shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-0 sm:text-2xl",
              completed && "text-muted-foreground line-through opacity-70"
            )}
            aria-label="Task title"
          />
        </div>

        {variant === "page" ? (
          <div className="flex items-center gap-1 pt-1">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="size-7 text-muted-foreground hover:text-foreground"
                    aria-label="More actions"
                  />
                }
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 text-xs">
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
                {canDelete ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="mr-2 size-3.5" /> Move to trash
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </div>
    </div>
  );

  const notesSection = (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">
        Notes & Details
      </Label>
      <Textarea
        value={description}
        rows={descFocused || description ? (variant === "page" ? 6 : 4) : 2}
        disabled={!canEdit || pending}
        onChange={(e) => setDescription(e.target.value)}
        onFocus={() => setDescFocused(true)}
        onBlur={() => {
          setDescFocused(false);
          saveFields({ description: description || null });
        }}
        placeholder="Write notes, instructions, or links here…"
        className={cn(
          "min-h-14 resize-none rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm leading-relaxed shadow-2xs placeholder:text-muted-foreground/50 transition-colors focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20",
          description ? "text-foreground" : "text-muted-foreground"
        )}
      />
    </div>
  );

  const checklistSection = (
    <TaskSection
      title="Checklist"
      className="border-t border-border pt-6"
      action={suggested.action}
    >
      {subtasksTotal > 0 ? (
        <div className="mb-3 space-y-1.5 rounded-lg border border-border/50 bg-muted/25 px-3 py-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {subtasksCompleted} of {subtasksTotal} completed
            </span>
            <span
              className={cn(
                "font-semibold text-xs",
                subtasksCompleted === subtasksTotal
                  ? "text-emerald-500 font-medium"
                  : "text-foreground"
              )}
            >
              {subtasksPercent}%
            </span>
          </div>
          <Progress value={subtasksPercent} className="h-1.5 w-full bg-muted/70" />
        </div>
      ) : null}

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
  );

  const attachmentsSection = (
    <TaskSection title="Files" className="border-t border-border/50 pt-6">
      <TaskAttachments
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
        taskId={task.id}
        canEdit={canEdit}
      />
    </TaskSection>
  );

  const collaborationSection = (
    <div className="border-t border-border/50 pt-6">
      <Tabs defaultValue="comments" className="w-full">
        <TabsList
          variant="default"
          className="mb-4 h-9 w-fit rounded-lg bg-muted/60 p-1"
        >
          <TabsTrigger
            value="comments"
            className="gap-2 rounded-md px-3 py-1 text-xs font-medium"
          >
            <MessageSquare className="size-3.5" />
            Comments
            {commentCount > 0 ? (
              <span className="rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground shadow-2xs">
                {commentCount}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="gap-2 rounded-md px-3 py-1 text-xs font-medium"
          >
            <History className="size-3.5" />
            Activity Log
          </TabsTrigger>
        </TabsList>
        <TabsContent value="comments" className="outline-none pt-1">
          <TaskComments
            workspaceId={workspaceId}
            workspaceSlug={workspaceSlug}
            taskId={task.id}
            canComment={canEdit}
            currentUserId={currentUserId}
            members={members}
            hideHeader
            onCountChange={setCommentCount}
          />
        </TabsContent>
        <TabsContent value="activity" className="outline-none pt-1">
          <TaskActivity workspaceId={workspaceId} taskId={task.id} />
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <div
      className={cn(
        "w-full",
        variant === "page"
          ? "grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start"
          : "space-y-6"
      )}
    >
      {/* Main Content Column */}
      <div className={cn("space-y-6", variant === "page" && "lg:col-span-2")}>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {/* Title row */}
        {titleRow}

        {/* Properties Card (in Sheet or mobile full page) */}
        {variant === "sheet" ? (
          propertiesCard
        ) : (
          <div className="lg:hidden">
            {propertiesCard}
          </div>
        )}

        {/* Notes & Details */}
        {notesSection}

        {/* Checklist */}
        {checklistSection}

        {/* Files / Attachments */}
        {attachmentsSection}

        {/* Collaboration (Comments & Activity) */}
        {collaborationSection}

        {pending ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Spinner className="size-3" /> Saving changes…
          </p>
        ) : null}
      </div>

      {/* Desktop Sticky Sidebar for Full Page view */}
      {variant === "page" ? (
        <aside className="hidden lg:block lg:col-span-1 space-y-4 sticky top-6">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Properties
          </div>
          {propertiesCard}

          {/* Task Info & Actions Card */}
          <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs text-xs space-y-3">
            <div className="text-xs font-medium text-foreground">Task Info</div>
            <div className="space-y-1.5 text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Created</span>
                <span className="font-medium text-foreground">
                  {task.createdAt
                    ? format(new Date(task.createdAt), "d MMM yyyy")
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last updated</span>
                <span className="font-medium text-foreground">
                  {format(new Date(task.updatedAt), "d MMM yyyy")}
                </span>
              </div>
              {task.completedAt ? (
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Completed</span>
                  <span className="font-medium">
                    {format(new Date(task.completedAt), "d MMM yyyy")}
                  </span>
                </div>
              ) : null}
            </div>

            {canEdit || canDelete ? (
              <div className="pt-2 border-t border-border/50 flex flex-col gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs h-8"
                  onClick={() => {
                    startTransition(async () => {
                      const result = await duplicateTaskAction({
                        workspaceId,
                        workspaceSlug,
                        taskId: task.id,
                      });
                      if (!result.success) toast.error(result.error.message);
                      else toast.success("Task duplicated");
                    });
                  }}
                >
                  <Copy className="mr-2 size-3.5" /> Duplicate task
                </Button>
                {canDelete ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="mr-2 size-3.5" /> Move to trash
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </aside>
      ) : null}

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
