"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createTaskAction } from "@/modules/tasks/task.actions";
import type { TaskPriority } from "@/modules/tasks/task.types";
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS } from "@/modules/tasks/task.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function InlineTaskCreate({
  workspaceId,
  workspaceSlug,
  defaultProjectId,
  canCreate,
  defaultOpen = false,
}: {
  workspaceId: string;
  workspaceSlug: string;
  defaultProjectId?: string | null;
  canCreate: boolean;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [pending, startTransition] = useTransition();

  if (!canCreate) return null;

  function reset() {
    setTitle("");
    setPriority("medium");
    setOpen(false);
  }

  function submit() {
    const trimmed = title.trim();
    if (!trimmed || pending) return;
    startTransition(async () => {
      const result = await createTaskAction({
        workspaceId,
        workspaceSlug,
        title: trimmed,
        priority,
        projectId: defaultProjectId ?? null,
        status: "todo",
        stayOnList: true,
      });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Task created");
      setTitle("");
      setPriority("medium");
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md border border-dashed px-2.5 py-1.5 text-left text-body text-muted-foreground",
          "transition-colors duration-(--duration-fast) hover:border-border-strong hover:bg-muted/40 hover:text-foreground"
        )}
      >
        <Plus className="size-3.5 shrink-0" />
        Add task
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-md border bg-card p-1.5 sm:flex-row sm:items-center">
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        disabled={pending}
        aria-label="New task title"
        className="h-8 flex-1 border-0 shadow-none focus-visible:ring-0"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            reset();
          }
        }}
      />
      <Select
        value={priority}
        disabled={pending}
        onValueChange={(v) => {
          if (v) setPriority(v as TaskPriority);
        }}
      >
        <SelectTrigger size="sm" className="h-8 w-full sm:w-28">
          <span className="flex-1 truncate text-left">
            {TASK_PRIORITY_LABELS[priority]}
          </span>
        </SelectTrigger>
        <SelectContent>
          {TASK_PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {TASK_PRIORITY_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          className="h-8"
          disabled={pending || !title.trim()}
          onClick={submit}
        >
          {pending ? <Spinner className="size-3.5" /> : "Add"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8"
          disabled={pending}
          onClick={reset}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
