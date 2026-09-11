"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import {
  TASK_PRIORITY_LABELS,
  type TaskRecord,
} from "@/modules/tasks/task.types";
import {
  softChipClass,
  TASK_PRIORITY_TONE,
} from "@/components/shared/status-styles";
import { TaskIconDisplay } from "@/components/tasks/task-icon-display";
import { Button } from "@/components/ui/button";
import { formatDueDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { isPast, isToday, startOfDay } from "date-fns";

export function TaskCard({
  task,
  workspaceSlug,
  disabled,
  onOpen,
}: {
  task: TaskRecord;
  workspaceSlug: string;
  disabled?: boolean;
  onOpen?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled });

  const completed = task.status === "completed";
  const dueOverdue =
    Boolean(task.dueAt) &&
    !completed &&
    isPast(startOfDay(new Date(task.dueAt!))) &&
    !isToday(new Date(task.dueAt!));

  const caption = [
    task.dueAt
      ? dueOverdue
        ? `Overdue · ${formatDueDate(task.dueAt)}`
        : formatDueDate(task.dueAt)
      : null,
    task.projectName,
  ].filter(Boolean);

  const title = (
    <span className="flex min-w-0 items-center gap-1.5">
      <TaskIconDisplay icon={task.icon} color={task.color} />
      <span
        className={cn(
          "truncate text-[14px] font-medium",
          completed && "text-muted-foreground line-through"
        )}
      >
        {task.title}
      </span>
    </span>
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        ...(task.color
          ? { boxShadow: `inset 3px 0 0 0 ${task.color}` }
          : undefined),
      }}
      className={cn(
        "group rounded-lg border border-border/40 bg-background p-2.5",
        "hover:border-border/70 hover:bg-muted/20",
        isDragging && "opacity-60"
      )}
    >
      <div className="flex items-start gap-0.5">
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className="mt-0.5 cursor-grab touch-none opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          aria-label="Drag task"
          disabled={disabled}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </Button>
        <div className="min-w-0 flex-1 space-y-1.5">
          {onOpen ? (
            <button
              type="button"
              onClick={onOpen}
              className="block w-full text-left hover:underline"
            >
              {title}
            </button>
          ) : (
            <Link
              href={`/w/${workspaceSlug}/tasks/${task.id}`}
              className="block hover:underline"
            >
              {title}
            </Link>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={softChipClass(TASK_PRIORITY_TONE[task.priority])}>
              {TASK_PRIORITY_LABELS[task.priority]}
            </span>
            {caption.length > 0 ? (
              <span
                className={cn(
                  "text-[12px] text-muted-foreground",
                  dueOverdue && "font-medium text-destructive"
                )}
              >
                {caption.join(" · ")}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
