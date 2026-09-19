"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { updateTaskAction } from "@/modules/tasks/task.actions";
import type { TaskRecord } from "@/modules/tasks/task.types";
import { TASK_PRIORITY_LABELS } from "@/modules/tasks/task.types";
import { formatDueDate } from "@/lib/date";
import { QuickAdd } from "@/components/tasks/quick-add";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProjectOption = { id: string; name: string };

export function HomeTaskList({
  workspaceId,
  workspaceSlug,
  todayTasks,
  overdueTasks,
  upcomingTasks,
  completedTasks,
  projects,
  canCreate,
}: {
  workspaceId: string;
  workspaceSlug: string;
  todayTasks: TaskRecord[];
  overdueTasks: TaskRecord[];
  upcomingTasks: TaskRecord[];
  completedTasks: TaskRecord[];
  projects: ProjectOption[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"today" | "upcoming" | "overdue" | "completed">("today");
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    () => new Set(completedTasks.map((t) => t.id))
  );
  const [, startTransition] = useTransition();
  const base = `/w/${workspaceSlug}`;

  const tabs = [
    {
      id: "today" as const,
      label: "Today",
      count: todayTasks.filter((t) => !completedIds.has(t.id)).length,
      tasks: todayTasks,
    },
    {
      id: "upcoming" as const,
      label: "Upcoming",
      count: upcomingTasks.filter((t) => !completedIds.has(t.id)).length,
      tasks: upcomingTasks,
    },
    {
      id: "overdue" as const,
      label: "Overdue",
      count: overdueTasks.filter((t) => !completedIds.has(t.id)).length,
      tasks: overdueTasks,
      badgeClassName: "bg-destructive/10 text-destructive",
    },
    {
      id: "completed" as const,
      label: "Completed",
      count: completedTasks.length,
      tasks: completedTasks,
    },
  ];

  const currentTab = tabs.find((t) => t.id === activeTab) ?? tabs[0];
  const displayTasks = currentTab.tasks;

  function toggleTask(taskId: string, currentStatus: string) {
    const isCompleted = completedIds.has(taskId) || currentStatus === "completed";
    const nextStatus = isCompleted ? "not_started" : "completed";

    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (isCompleted) next.delete(taskId);
      else next.add(taskId);
      return next;
    });

    startTransition(async () => {
      const res = await updateTaskAction({
        workspaceId,
        workspaceSlug,
        taskId,
        status: nextStatus,
      });
      if (!res.success) {
        toast.error("Failed to update task");
        setCompletedIds((prev) => {
          const next = new Set(prev);
          if (isCompleted) next.add(taskId);
          else next.delete(taskId);
          return next;
        });
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      {/* Notion-style View Tabs */}
      <div className="flex items-center justify-between border-b border-border/60 pb-1">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-accent text-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-semibold",
                    isActive
                      ? "bg-foreground/10 text-foreground"
                      : "bg-muted text-muted-foreground",
                    tab.badgeClassName
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <Link
          href={`${base}/tasks`}
          className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>All tasks</span>
          <ExternalLink className="size-3" />
        </Link>
      </div>

      {/* Task List items */}
      <div className="rounded-lg border border-border/70 bg-card overflow-hidden divide-y divide-border/40">
        {displayTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <CheckCircle2 className="size-6 text-muted-foreground/40 mb-2" />
            <p className="text-xs font-medium text-foreground">No tasks in {currentTab.label.toLowerCase()}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {activeTab === "today"
                ? "You're all caught up for today!"
                : "Add a task below to schedule your work."}
            </p>
          </div>
        ) : (
          displayTasks.map((task) => {
            const isDone = completedIds.has(task.id) || task.status === "completed";
            return (
              <div
                key={task.id}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2 text-xs transition-colors hover:bg-muted/40",
                  isDone && "opacity-60"
                )}
              >
                {/* Notion-style Round Checkbox */}
                <button
                  type="button"
                  aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                  onClick={() => toggleTask(task.id, task.status)}
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                    isDone
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/40 hover:border-foreground"
                  )}
                >
                  {isDone ? <Check className="size-3 stroke-[2.5]" /> : null}
                </button>

                {/* Title and meta */}
                <Link
                  href={`${base}/tasks?taskId=${task.id}`}
                  className="min-w-0 flex-1 flex items-center justify-between gap-3"
                >
                  <span
                    className={cn(
                      "truncate font-medium text-foreground",
                      isDone && "line-through text-muted-foreground font-normal"
                    )}
                  >
                    {task.title}
                  </span>

                  <div className="flex shrink-0 items-center gap-2">
                    {task.projectName ? (
                      <span className="hidden sm:inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        <span className="size-1.5 rounded-full bg-primary/40" />
                        <span className="truncate max-w-[100px]">{task.projectName}</span>
                      </span>
                    ) : null}

                    {task.dueAt ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-[11px]",
                          activeTab === "overdue" || (task.status !== "completed" && new Date(task.dueAt) < new Date())
                            ? "text-destructive font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        <Calendar className="size-3" />
                        <span>{formatDueDate(task.dueAt)}</span>
                      </span>
                    ) : null}

                    {task.priority && task.priority !== "medium" ? (
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.2 text-[10px] font-medium uppercase",
                          task.priority === "urgent" || task.priority === "high"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {TASK_PRIORITY_LABELS[task.priority]}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Add row */}
      {canCreate ? (
        <div className="pt-1">
          <QuickAdd
            workspaceId={workspaceId}
            workspaceSlug={workspaceSlug}
            projects={projects}
            canCreate={canCreate}
            placeholder="Add a new task..."
          />
        </div>
      ) : null}
    </div>
  );
}
