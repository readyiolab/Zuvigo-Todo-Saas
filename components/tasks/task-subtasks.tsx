"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import {
  createTaskAction,
  deleteTaskAction,
  updateTaskAction,
} from "@/modules/tasks/task.actions";
import type { TaskRecord } from "@/modules/tasks/task.types";
import { TaskCheckbox } from "@/components/tasks/task-checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function mergeById(server: TaskRecord[], local: TaskRecord[]): TaskRecord[] {
  const serverIds = new Set(server.map((t) => t.id));
  // Keep optimistic locals that aren't on server yet (temp or race)
  const pendingLocal = local.filter((t) => !serverIds.has(t.id));
  return [...server, ...pendingLocal];
}

export function TaskSubtasks({
  workspaceId,
  workspaceSlug,
  parentTaskId,
  canEdit,
  canCreate,
  initial = [],
}: {
  workspaceId: string;
  workspaceSlug: string;
  parentTaskId: string;
  canEdit: boolean;
  canCreate: boolean;
  initial?: TaskRecord[];
}) {
  const [items, setItems] = useState<TaskRecord[]>(initial);
  const [title, setTitle] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const mutatingRef = useRef(false);
  const serverKey = initial
    .map((t) => `${t.id}:${t.status}:${t.title}`)
    .join("|");

  // Sync when server props change (sheet refresh / parent remount)
  useEffect(() => {
    if (mutatingRef.current) return;
    setItems((prev) => mergeById(initial, prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- serverKey fingerprints initial
  }, [serverKey]);

  // Reset when switching parent tasks
  useEffect(() => {
    setItems(initial);
    setTitle("");
    setShowComposer(false);
    setEditingId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentTaskId]);

  function add() {
    if (!canCreate || !title.trim()) return;
    const draftTitle = title.trim();
    const tempId = `temp-${Date.now()}`;
    const optimistic: TaskRecord = {
      id: tempId,
      workspaceId,
      projectId: null,
      projectName: null,
      parentTaskId,
      title: draftTitle,
      description: null,
      icon: null,
      color: null,
      status: "todo",
      priority: "medium",
      startAt: null,
      dueAt: null,
      followUpAt: null,
      remindAt: null,
      recurrenceRule: null,
      sortOrder: "a0",
      createdBy: "",
      createdAt: new Date(),
      completedAt: null,
      estimatedDurationMinutes: null,
      actualDurationMinutes: null,
      focusStartedAt: null,
      updatedAt: new Date(),
      assignees: [],
    };
    mutatingRef.current = true;
    setItems((prev) => [...prev, optimistic]);
    setTitle("");
    setShowComposer(true);
    startTransition(async () => {
      const result = await createTaskAction({
        workspaceId,
        workspaceSlug,
        title: draftTitle,
        parentTaskId,
        stayOnList: true,
      });
      mutatingRef.current = false;
      if (!result.success) {
        toast.error(result.error.message);
        setItems((prev) => prev.filter((t) => t.id !== tempId));
        return;
      }
      const task = (result.data as { task?: TaskRecord } | undefined)?.task;
      if (task) {
        setItems((prev) =>
          prev.map((t) => (t.id === tempId ? task : t))
        );
      } else {
        const taskId = (result.data as { taskId?: string } | undefined)?.taskId;
        if (taskId) {
          setItems((prev) =>
            prev.map((t) =>
              t.id === tempId ? { ...optimistic, id: taskId } : t
            )
          );
        }
      }
    });
  }

  function toggle(task: TaskRecord, checked: boolean) {
    if (!canEdit) return;
    const next = checked ? "completed" : "todo";
    mutatingRef.current = true;
    setItems((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: next } : t))
    );
    startTransition(async () => {
      const result = await updateTaskAction({
        workspaceId,
        workspaceSlug,
        taskId: task.id,
        status: next,
      });
      mutatingRef.current = false;
      if (!result.success) {
        toast.error(result.error.message);
        setItems((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, status: task.status } : t
          )
        );
      }
    });
  }

  function saveRename(task: TaskRecord) {
    const next = editTitle.trim();
    if (!next || next === task.title) {
      setEditingId(null);
      return;
    }
    mutatingRef.current = true;
    setItems((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, title: next } : t))
    );
    setEditingId(null);
    startTransition(async () => {
      const result = await updateTaskAction({
        workspaceId,
        workspaceSlug,
        taskId: task.id,
        title: next,
      });
      mutatingRef.current = false;
      if (!result.success) {
        toast.error(result.error.message);
        setItems((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, title: task.title } : t
          )
        );
      }
    });
  }

  function remove(task: TaskRecord) {
    if (!canEdit) return;
    mutatingRef.current = true;
    setItems((prev) => prev.filter((t) => t.id !== task.id));
    startTransition(async () => {
      const result = await deleteTaskAction({
        workspaceId,
        workspaceSlug,
        taskId: task.id,
        stayOnList: true,
      });
      mutatingRef.current = false;
      if (result && !result.success) {
        toast.error(result.error.message);
        setItems((prev) => [...prev, task]);
      }
    });
  }

  return (
    <div className="space-y-0.5">
      {items.map((task) => (
        <div
          key={task.id}
          className="group/sub flex min-h-8 items-center gap-2 rounded-md px-0.5 py-0.5 hover:bg-muted/30"
        >
          <TaskCheckbox
            checked={task.status === "completed"}
            disabled={!canEdit || pending || task.id.startsWith("temp-")}
            label={`Complete ${task.title}`}
            onCheckedChange={(checked) => toggle(task, checked)}
          />
          {editingId === task.id ? (
            <Input
              value={editTitle}
              autoFocus
              disabled={pending}
              className="h-7 flex-1 border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-2 focus-visible:ring-ring/30"
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => saveRename(task)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveRename(task);
                }
                if (e.key === "Escape") setEditingId(null);
              }}
            />
          ) : (
            <button
              type="button"
              className={cn(
                "min-w-0 flex-1 truncate rounded-sm text-left text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                task.status === "completed" &&
                  "text-muted-foreground line-through"
              )}
              disabled={!canEdit || task.id.startsWith("temp-")}
              onClick={() => {
                if (!canEdit) return;
                setEditingId(task.id);
                setEditTitle(task.title);
              }}
            >
              {task.title}
            </button>
          )}
          {canEdit && !task.id.startsWith("temp-") ? (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              className="size-6 shrink-0 opacity-0 group-hover/sub:opacity-100 focus-visible:opacity-100"
              aria-label={`Delete ${task.title}`}
              disabled={pending}
              onClick={() => remove(task)}
            >
              <Trash2 className="size-3" />
            </Button>
          ) : null}
        </div>
      ))}

      {canCreate ? (
        showComposer || items.length > 0 ? (
          <div className="flex items-center gap-1.5 pt-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add sub-task…"
              className="h-8 border-0 bg-transparent px-0 text-[13px] shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring/30"
              disabled={pending}
              autoFocus={showComposer && items.length === 0}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
            />
            <Button
              type="button"
              size="xs"
              variant="ghost"
              className="h-7 text-muted-foreground"
              disabled={pending || !title.trim()}
              onClick={add}
            >
              Add
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="mt-0.5 rounded-sm text-[13px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
            onClick={() => setShowComposer(true)}
          >
            + Add sub-task
          </button>
        )
      ) : items.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No subtasks</p>
      ) : null}
    </div>
  );
}
