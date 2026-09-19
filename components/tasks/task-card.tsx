"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  Calendar,
  ChevronsUp,
  Flame,
  Folder,
  GripVertical,
  Minus,
  Tag,
} from "lucide-react";
import {
  TASK_PRIORITY_LABELS,
  type TaskPriority,
  type TaskRecord,
} from "@/modules/tasks/task.types";
import {
  softChipClass,
  TASK_PRIORITY_TONE,
} from "@/components/shared/status-styles";
import { TaskIconDisplay } from "@/components/tasks/task-icon-display";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDueDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { isPast, isToday, startOfDay } from "date-fns";

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
      return <Flame className="size-3 text-rose-500 shrink-0" />;
    case "high":
      return <ChevronsUp className="size-3 text-amber-500 shrink-0" />;
    case "medium":
      return <Minus className="size-3 text-blue-500 shrink-0" />;
    case "low":
    default:
      return <ArrowDown className="size-3 text-muted-foreground shrink-0" />;
  }
}

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

  const cardContent = (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        ...(task.color ? { borderLeft: `3px solid ${task.color}` } : undefined),
      }}
      className={cn(
        "group relative flex flex-col gap-2.5 rounded-xl border border-border/60 bg-card p-3.5 shadow-2xs transition-all duration-150",
        "hover:border-border/80 hover:shadow-xs",
        isDragging && "opacity-40 scale-[0.98] ring-2 ring-primary/25"
      )}
    >
      {/* Top row: Project Badge & Grip handle */}
      <div className="flex items-center justify-between gap-2">
        {task.projectName ? (
          <span className="inline-flex max-w-[75%] items-center gap-1.5 truncate rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            <Folder className="size-2.5 shrink-0 opacity-70" />
            <span className="truncate">@{task.projectName}</span>
          </span>
        ) : (
          <span className="text-[11px] font-medium text-muted-foreground/50">Inbox</span>
        )}

        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className="size-6 shrink-0 cursor-grab touch-none opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          aria-label="Drag task"
          disabled={disabled}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5 text-muted-foreground" />
        </Button>
      </div>

      {/* Title */}
      <div className="min-w-0">
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="block w-full text-left"
          >
            <span className="flex items-start gap-1.5">
              <TaskIconDisplay icon={task.icon} color={task.color} />
              <span
                className={cn(
                  "line-clamp-2 text-[13px] font-medium leading-snug text-foreground",
                  completed && "text-muted-foreground line-through opacity-70"
                )}
              >
                {task.title}
              </span>
            </span>
          </button>
        ) : (
          <Link
            href={`/w/${workspaceSlug}/tasks/${task.id}`}
            className="block"
          >
            <span className="flex items-start gap-1.5">
              <TaskIconDisplay icon={task.icon} color={task.color} />
              <span
                className={cn(
                  "line-clamp-2 text-[13px] font-medium leading-snug text-foreground",
                  completed && "text-muted-foreground line-through opacity-70"
                )}
              >
                {task.title}
              </span>
            </span>
          </Link>
        )}
      </div>

      {/* Tags if present — max 2 to reduce clutter */}
      {task.tags && task.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {task.tags.slice(0, 2).map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted/50 text-muted-foreground"
            >
              <Tag className="size-2 shrink-0 opacity-60" />
              {t.name}
            </span>
          ))}
          {task.tags.length > 2 ? (
            <span className="text-[10px] text-muted-foreground/60">
              +{task.tags.length - 2}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Card Footer */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/30 pt-2 text-xs">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
              softChipClass(TASK_PRIORITY_TONE[task.priority])
            )}
          >
            <PriorityIcon priority={task.priority} />
            <span>{TASK_PRIORITY_LABELS[task.priority]}</span>
          </span>

          {task.dueAt ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                dueOverdue
                  ? "bg-rose-500/10 font-semibold text-rose-600 dark:text-rose-400"
                  : isToday(new Date(task.dueAt))
                    ? "bg-amber-500/10 font-semibold text-amber-600 dark:text-amber-400"
                    : "bg-muted/40 text-muted-foreground"
              )}
            >
              <Calendar className="size-2.5 shrink-0" />
              <span className="truncate">
                {dueOverdue ? "Overdue" : formatDueDate(task.dueAt)}
              </span>
            </span>
          ) : null}
        </div>

        {task.assignees && task.assignees.length > 0 ? (
          <div className="flex shrink-0 items-center -space-x-1.5">
            {task.assignees.slice(0, 2).map((a) => (
              <Avatar
                key={a.userId}
                className="size-5 border border-background shadow-xs ring-1 ring-border/40"
                title={a.name}
              >
                <AvatarFallback className="bg-primary/10 text-[8px] font-semibold text-primary">
                  {initials(a.name)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );

  return cardContent;
}
