"use client";

import { useEffect, useState, useTransition } from "react";
import { format, formatDistanceToNow, isToday } from "date-fns";
import { listActivityForResourceAction } from "@/modules/activity/activity.actions";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "@/modules/tasks/task.types";
import { Spinner } from "@/components/ui/spinner";

type ActivityItem = {
  id: string;
  action: string;
  actorName: string | null;
  createdAt: string | Date;
  metadata?: Record<string, unknown> | null;
};

function phraseFor(item: ActivityItem) {
  const meta = item.metadata ?? {};
  switch (item.action) {
    case "task.created":
      return "created this task";
    case "task.status_changed": {
      const status = meta.status;
      if (typeof status === "string" && status in TASK_STATUS_LABELS) {
        return `changed status to ${TASK_STATUS_LABELS[status as TaskStatus]}`;
      }
      return "changed the status";
    }
    case "task.assignees_changed":
      return "updated assignees";
    case "task.watchers_changed":
      return "updated watchers";
    case "task.attachment_added":
      return "added a file";
    case "task.attachment_removed":
      return "removed a file";
    case "task.commented":
      return "left a comment";
    case "task.completed":
      return "marked this done";
    case "task.reopened":
      return "reopened this task";
    case "task.priority_changed": {
      const priority = meta.priority;
      if (typeof priority === "string" && priority in TASK_PRIORITY_LABELS) {
        return `set priority to ${TASK_PRIORITY_LABELS[priority as TaskPriority]}`;
      }
      return "updated the priority";
    }
    case "task.updated":
      return "updated the task";
    default:
      return "updated the task";
  }
}

function formatActivityTime(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (isToday(date)) {
    return `Today · ${format(date, "h:mm a")}`;
  }
  return formatDistanceToNow(date, { addSuffix: true });
}

export function TaskActivity({
  workspaceId,
  taskId,
}: {
  workspaceId: string;
  taskId: string;
}) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await listActivityForResourceAction({
        workspaceId,
        resourceType: "task",
        resourceId: taskId,
        limit: 40,
      });
      setLoading(false);
      if (!result.success || !result.data) return;
      setItems((result.data as { items: ActivityItem[] }).items);
    });
  }, [taskId, workspaceId]);

  if (loading) {
    return (
      <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
        <Spinner className="size-3" /> Loading…
      </p>
    );
  }

  if (items.length === 0) {
    return <p className="text-caption text-muted-foreground">No activity yet</p>;
  }

  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.id} className="text-[12px] leading-relaxed text-foreground/80">
          <span className="font-medium text-foreground">
            {item.actorName ?? "Someone"}
          </span>{" "}
          {phraseFor(item)}
          <span className="text-caption text-muted-foreground">
            {" · "}
            {formatActivityTime(item.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
