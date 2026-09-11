"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createTaskAction } from "@/modules/tasks/task.actions";
import { createTagAction, listTagsAction } from "@/modules/tags/tag.actions";
import {
  DURATION_PRESETS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  type TaskPriority,
} from "@/modules/tasks/task.types";
import { parseQuickAdd } from "@/lib/quick-add-parse";
import { formatDurationMinutes } from "@/modules/productivity/priority.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type ProjectOption = { id: string; name: string };

export function QuickAdd({
  workspaceId,
  workspaceSlug,
  projects = [],
  defaultProjectId,
  canCreate,
  autoFocus = false,
  className,
  placeholder = "Try: Call John tomorrow at 10am for 30 minutes",
}: {
  workspaceId: string;
  workspaceSlug: string;
  projects?: ProjectOption[];
  defaultProjectId?: string | null;
  canCreate: boolean;
  autoFocus?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [expanded, setExpanded] = useState(autoFocus);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [dueLocal, setDueLocal] = useState("");
  const [duration, setDuration] = useState<number | "">("");
  const [pending, startTransition] = useTransition();
  const parsed = useMemo(() => parseQuickAdd(value), [value]);

  if (!canCreate) return null;

  function reset() {
    setValue("");
    setPriority("medium");
    setProjectId(defaultProjectId ?? "");
    setDueLocal("");
    setDuration("");
    setExpanded(false);
  }

  function submit() {
    if (!value.trim() || pending) return;
    const draft = parseQuickAdd(value);
    if (!draft.title) return;

    let resolvedProject = projectId || defaultProjectId || null;
    if (draft.projectHint) {
      const match = projects.find(
        (p) => p.name.toLowerCase() === draft.projectHint!.toLowerCase()
      );
      if (match) resolvedProject = match.id;
    }

    const dueAt =
      draft.dueAt ?? (dueLocal ? new Date(dueLocal).toISOString() : null);
    const estimatedDurationMinutes =
      draft.estimatedDurationMinutes ??
      (typeof duration === "number" ? duration : null);

    startTransition(async () => {
      let tagIds: string[] = [];
      if (draft.tags.length > 0) {
        const listed = await listTagsAction({ workspaceId });
        const existing =
          listed.success && listed.data
            ? (
                listed.data as {
                  tags: Array<{ id: string; name: string }>;
                }
              ).tags
            : [];
        for (const name of draft.tags) {
          const found = existing.find(
            (t) => t.name.toLowerCase() === name.toLowerCase()
          );
          if (found) {
            tagIds.push(found.id);
            continue;
          }
          const created = await createTagAction({
            workspaceId,
            workspaceSlug,
            name,
          });
          if (created.success && created.data) {
            tagIds.push((created.data as { tag: { id: string } }).tag.id);
          }
        }
      }

      const result = await createTaskAction({
        workspaceId,
        workspaceSlug,
        title: draft.title,
        priority: draft.priority ?? priority,
        dueAt,
        projectId: resolvedProject,
        estimatedDurationMinutes,
        tagIds,
        status: "todo",
        stayOnList: true,
      });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Task created");
      reset();
      router.refresh();
    });
  }

  const confirmBits: string[] = [];
  if (parsed.title && parsed.title !== value.trim()) {
    confirmBits.push(`Title: ${parsed.title}`);
  }
  if (parsed.dueAt) {
    confirmBits.push(`Due: ${format(new Date(parsed.dueAt), "d MMM · h:mm a")}`);
  }
  if (parsed.priority) {
    confirmBits.push(`Priority: ${TASK_PRIORITY_LABELS[parsed.priority]}`);
  }
  if (parsed.estimatedDurationMinutes) {
    confirmBits.push(
      `Duration: ${formatDurationMinutes(parsed.estimatedDurationMinutes)}`
    );
  }
  if (parsed.projectHint) confirmBits.push(`Project: ${parsed.projectHint}`);
  if (parsed.tags.length) confirmBits.push(`Tags: ${parsed.tags.join(", ")}`);

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-background transition-[border-color,box-shadow]",
        expanded
          ? "border-border/70 shadow-subtle ring-1 ring-primary/15"
          : "hover:border-border",
        className
      )}
    >
      <div className="flex items-center gap-2 px-2.5 py-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Plus className="size-3.5" />
        </div>
        <Input
          ref={inputRef}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setExpanded(true)}
          placeholder={placeholder}
          disabled={pending}
          aria-label="Create task"
          className="h-9 flex-1 border-0 bg-transparent px-0 text-[15px] shadow-none focus-visible:ring-0"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              reset();
              inputRef.current?.blur();
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          className="h-8 shrink-0 px-3"
          disabled={pending || !value.trim()}
          onClick={submit}
        >
          {pending ? <Spinner className="size-3.5" /> : "Create"}
        </Button>
      </div>

      {expanded ? (
        <div className="space-y-2 border-t border-border/40 px-2.5 py-2.5">
          {confirmBits.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {confirmBits.map((bit) => (
                <span
                  key={bit}
                  className="rounded-md bg-primary-soft/60 px-2 py-0.5 text-[11px] font-medium text-primary"
                >
                  {bit}
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={priority}
              onValueChange={(v) => v && setPriority(v as TaskPriority)}
            >
              <SelectTrigger
                size="sm"
                className="h-8 w-auto min-w-[7rem] border-border/50 bg-muted/30 text-caption shadow-none"
                aria-label="Priority"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {TASK_PRIORITY_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dueLocal}
              onChange={(e) => setDueLocal(e.target.value)}
              aria-label="Due date"
              className="h-8 w-auto min-w-[9.5rem] border-border/50 bg-muted/30 text-caption shadow-none"
            />

            <Select
              value={duration === "" ? "__none" : String(duration)}
              onValueChange={(v) =>
                setDuration(v === "__none" || !v ? "" : Number(v))
              }
            >
              <SelectTrigger
                size="sm"
                className="h-8 w-auto min-w-[7rem] border-border/50 bg-muted/30 text-caption shadow-none"
                aria-label="Duration"
              >
                <SelectValue placeholder="Duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No estimate</SelectItem>
                {DURATION_PRESETS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {formatDurationMinutes(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {projects.length > 0 ? (
              <Select
                value={projectId || "__none"}
                onValueChange={(v) =>
                  setProjectId(v === "__none" || !v ? "" : String(v))
                }
              >
                <SelectTrigger
                  size="sm"
                  className="h-8 w-auto min-w-[8rem] max-w-[12rem] border-border/50 bg-muted/30 text-caption shadow-none"
                  aria-label="Project"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
