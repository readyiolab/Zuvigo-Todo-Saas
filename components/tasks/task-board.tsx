"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { moveTaskAction } from "@/modules/tasks/task.actions";
import { sortOrderBetween } from "@/modules/editor/editor.types";
import {
  type TaskRecord,
  type TaskStatus,
} from "@/modules/tasks/task.types";
import { TaskCard } from "@/components/tasks/task-card";
import { TASK_STATUS_COLUMN } from "@/components/shared/status-styles";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Board columns mapped to existing statuses (UI translation). */
const BOARD_COLUMNS: Array<{ status: TaskStatus; label: string }> = [
  { status: "todo", label: "To do" },
  { status: "in_progress", label: "In Progress" },
  { status: "blocked", label: "Review" },
  { status: "completed", label: "Done" },
];

const BOARD_STATUS_IDS = BOARD_COLUMNS.map((c) => c.status);

export function TaskBoard({
  workspaceId,
  workspaceSlug,
  tasks: initialTasks,
  canMove,
  onOpenTask,
}: {
  workspaceId: string;
  workspaceSlug: string;
  tasks: TaskRecord[];
  canMove: boolean;
  onOpenTask?: (taskId: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tasks, setOptimistic] = useOptimistic(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const columns = useMemo(() => {
    const map = Object.fromEntries(
      BOARD_STATUS_IDS.map((s) => [s, [] as TaskRecord[]])
    ) as Record<TaskStatus, TaskRecord[]>;
    for (const task of tasks) {
      if (task.status === "cancelled") continue;
      if (map[task.status]) map[task.status].push(task);
      else map.todo.push(task);
    }
    for (const status of BOARD_STATUS_IDS) {
      map[status].sort((a, b) => a.sortOrder.localeCompare(b.sortOrder));
    }
    return map;
  }, [tasks]);

  const activeTask = activeId
    ? tasks.find((t) => t.id === activeId) ?? null
    : null;

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    if (!canMove) return;

    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    let nextStatus: TaskStatus = task.status;
    let overTaskId: string | null = null;

    const overId = String(over.id);
    if (BOARD_STATUS_IDS.includes(overId as TaskStatus)) {
      nextStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (!overTask) return;
      nextStatus = overTask.status;
      overTaskId = overTask.id;
    }

    const columnTasks = tasks
      .filter((t) => t.status === nextStatus && t.id !== taskId)
      .sort((a, b) => a.sortOrder.localeCompare(b.sortOrder));

    let insertIndex = columnTasks.length;
    if (overTaskId) {
      const idx = columnTasks.findIndex((t) => t.id === overTaskId);
      if (idx >= 0) insertIndex = idx;
    }

    const before = columnTasks[insertIndex - 1] ?? null;
    const after = columnTasks[insertIndex] ?? null;
    const sortOrder = sortOrderBetween(
      before?.sortOrder ?? null,
      after?.sortOrder ?? null
    );

    const moved: TaskRecord = { ...task, status: nextStatus, sortOrder };
    const nextList = [...tasks.filter((t) => t.id !== taskId), moved];

    startTransition(async () => {
      setError(null);
      setOptimistic(nextList);
      const result = await moveTaskAction({
        workspaceId,
        workspaceSlug,
        taskId,
        status: nextStatus,
        sortOrder,
      });
      if (!result.success) {
        setError(result.error.message);
        toast.error(result.error.message);
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className={cn("space-y-3", pending && "opacity-80")}>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {pending ? (
        <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
          <Spinner className="size-3" /> Updating board…
        </p>
      ) : null}
      <DndContext
        id={`task-board-${workspaceId}`}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="grid gap-4 overflow-x-auto pb-1 md:grid-cols-2 xl:grid-cols-4">
          {BOARD_COLUMNS.map((col) => (
            <BoardColumn
              key={col.status}
              status={col.status}
              label={col.label}
              tasks={columns[col.status]}
              workspaceSlug={workspaceSlug}
              disabled={!canMove || pending}
              onOpenTask={onOpenTask}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="w-72 rounded-xl border border-primary/40 bg-card p-3 shadow-2xl ring-2 ring-primary/25 rotate-2">
              <p className="text-[13px] font-medium leading-snug text-foreground">
                {activeTask.title}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="inline-flex rounded-md bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Moving task
                </span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
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

function BoardColumn({
  status,
  label,
  tasks,
  workspaceSlug,
  disabled,
  onOpenTask,
}: {
  status: TaskStatus;
  label: string;
  tasks: TaskRecord[];
  workspaceSlug: string;
  disabled?: boolean;
  onOpenTask?: (taskId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const chrome = TASK_STATUS_COLUMN[status];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[450px] min-w-[260px] flex-col gap-3.5 rounded-2xl border border-border/50 bg-muted/20 p-3.5 transition-all shadow-2xs",
        isOver && "border-primary/50 bg-primary/5 ring-2 ring-primary/20"
      )}
    >
      <div className={cn("h-1 w-full rounded-full", chrome.bar)} />
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          <h2 className="text-xs font-semibold tracking-tight text-foreground">
            {label}
          </h2>
        </div>
        <span
          className={cn(
            "inline-flex min-w-5 h-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
            chrome.count
          )}
        >
          {tasks.length}
        </span>
      </div>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-2.5">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              workspaceSlug={workspaceSlug}
              disabled={disabled}
              onOpen={onOpenTask ? () => onOpenTask(task.id) : undefined}
            />
          ))}

          {tasks.length === 0 ? (
            <div className="flex flex-1 min-h-[120px] items-center justify-center rounded-xl border border-dashed border-border/50 bg-background/30 px-3 py-6 text-center">
              <p className="text-xs text-muted-foreground/60 font-medium">No tasks in this column</p>
            </div>
          ) : null}
        </div>
      </SortableContext>
    </div>
  );
}
