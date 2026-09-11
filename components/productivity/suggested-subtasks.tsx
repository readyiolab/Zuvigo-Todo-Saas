"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ListTree, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  addSuggestedSubtasksAction,
  breakDownTaskAction,
} from "@/modules/productivity/productivity.actions";
import type { TaskRecord } from "@/modules/tasks/task.types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

type Suggestion = { title: string; selected: boolean };

export function useSuggestedSubtasks({
  workspaceId,
  workspaceSlug,
  taskId,
  title,
  description,
  canCreate,
  onCreated,
}: {
  workspaceId: string;
  workspaceSlug: string;
  taskId: string;
  title: string;
  description?: string | null;
  canCreate: boolean;
  onCreated?: (tasks: TaskRecord[]) => void;
}): { action: ReactNode; panel: ReactNode } {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [source, setSource] = useState<"ai" | "heuristic" | null>(null);

  if (!canCreate) {
    return { action: null, panel: null };
  }

  function loadSuggestions() {
    startTransition(async () => {
      const result = await breakDownTaskAction({
        workspaceId,
        title,
        description,
      });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      const data = result.data as {
        suggestions: Array<{ title: string }>;
        source: "ai" | "heuristic";
      };
      setSource(data.source);
      setSuggestions(
        data.suggestions.map((s) => ({ title: s.title, selected: true }))
      );
    });
  }

  function addSelected() {
    if (!suggestions) return;
    const titles = suggestions.filter((s) => s.selected).map((s) => s.title);
    if (titles.length === 0) {
      toast.error("Select at least one subtask");
      return;
    }
    startTransition(async () => {
      const result = await addSuggestedSubtasksAction({
        workspaceId,
        workspaceSlug,
        parentTaskId: taskId,
        titles,
      });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      const tasks =
        (result.data as { tasks?: TaskRecord[] } | undefined)?.tasks ?? [];
      if (tasks.length > 0) onCreated?.(tasks);
      toast.success(
        titles.length === 1 ? "Subtask added" : `${titles.length} subtasks added`
      );
      setSuggestions(null);
      router.refresh();
    });
  }

  const action = (
    <Button
      type="button"
      size="xs"
      variant="ghost"
      className="h-7 gap-1 text-muted-foreground hover:text-foreground"
      disabled={pending}
      onClick={loadSuggestions}
    >
      {pending && !suggestions ? (
        <Spinner className="size-3" />
      ) : (
        <ListTree className="size-3" />
      )}
      Suggest
    </Button>
  );

  const panel = suggestions ? (
    <div className="space-y-2 rounded-lg border border-primary/20 bg-primary-soft/30 p-3">
      {source ? (
        <p className="text-[11px] text-muted-foreground">
          {source === "ai" ? "AI suggestions" : "Heuristic suggestions"} — review
          before adding
        </p>
      ) : null}
      <ul className="space-y-2">
        {suggestions.map((s, i) => (
          <li key={`${s.title}-${i}`} className="flex items-start gap-2">
            <Checkbox
              checked={s.selected}
              onCheckedChange={(v) => {
                setSuggestions((prev) =>
                  prev
                    ? prev.map((item, idx) =>
                        idx === i
                          ? { ...item, selected: v === true }
                          : item
                      )
                    : prev
                );
              }}
              aria-label={`Include ${s.title}`}
              className="mt-1"
            />
            <Input
              value={s.title}
              onChange={(e) => {
                const value = e.target.value;
                setSuggestions((prev) =>
                  prev
                    ? prev.map((item, idx) =>
                        idx === i ? { ...item, title: value } : item
                      )
                    : prev
                );
              }}
              className="h-8 border-0 bg-transparent px-0 text-[13px] shadow-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" size="sm" disabled={pending} onClick={addSelected}>
          {pending ? <Spinner className="size-3.5" /> : <Plus className="size-3.5" />}
          Add selected
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => setSuggestions(null)}
        >
          Dismiss
        </Button>
      </div>
    </div>
  ) : null;

  return { action, panel };
}

/** Standalone wrapper kept for any non-section call sites. */
export function SuggestedSubtasks(
  props: Parameters<typeof useSuggestedSubtasks>[0]
) {
  const { action, panel } = useSuggestedSubtasks(props);
  if (!action && !panel) return null;
  return (
    <div className="space-y-3">
      {action ? <div className="flex justify-end">{action}</div> : null}
      {panel}
    </div>
  );
}
