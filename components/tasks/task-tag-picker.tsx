"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { setTaskTagsAction } from "@/modules/tasks/task.actions";
import {
  createTagAction,
  listTagsAction,
} from "@/modules/tags/tag.actions";
import type { TaskTag } from "@/modules/tasks/task.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TagOption = { id: string; name: string; color: string | null };

export function TaskTagPicker({
  workspaceId,
  workspaceSlug,
  taskId,
  value,
  canEdit,
}: {
  workspaceId: string;
  workspaceSlug: string;
  taskId: string;
  value: TaskTag[];
  canEdit: boolean;
}) {
  const [tags, setTags] = useState<TagOption[]>([]);
  const [selected, setSelected] = useState<string[]>(() =>
    value.map((t) => t.id)
  );
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await listTagsAction({ workspaceId });
      if (result.success && result.data) {
        setTags((result.data as { tags: TagOption[] }).tags);
      }
    });
  }, [workspaceId]);

  useEffect(() => {
    setSelected(value.map((t) => t.id));
  }, [value]);

  const selectedTags = tags.filter((t) => selected.includes(t.id));
  // Fall back to value props if tags list not loaded yet
  const displayTags =
    selectedTags.length > 0
      ? selectedTags
      : value.filter((t) => selected.includes(t.id));

  function persist(next: string[]) {
    setSelected(next);
    if (!canEdit) return;
    startTransition(async () => {
      const result = await setTaskTagsAction({
        workspaceId,
        workspaceSlug,
        taskId,
        tagIds: next,
      });
      if (!result.success) toast.error(result.error.message);
    });
  }

  function create() {
    if (!canEdit || !newName.trim()) return;
    startTransition(async () => {
      const result = await createTagAction({
        workspaceId,
        workspaceSlug,
        name: newName.trim(),
      });
      if (!result.success || !result.data) {
        toast.error(result.success ? "Failed" : result.error.message);
        return;
      }
      const tag = (result.data as { tag: TagOption }).tag;
      setTags((prev) => [...prev, tag]);
      setNewName("");
      persist([...selected, tag.id]);
    });
  }

  if (!canEdit) {
    return displayTags.length > 0 ? (
      <div className="flex flex-wrap gap-1.5">
        {displayTags.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center rounded-md bg-muted/70 px-2 py-0.5 text-[12px] font-medium text-foreground/80"
          >
            {t.name}
          </span>
        ))}
      </div>
    ) : (
      <p className="text-[13px] text-muted-foreground">No tags</p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {displayTags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-2 py-0.5 text-[12px] font-medium text-foreground/80"
        >
          {tag.name}
          <button
            type="button"
            disabled={pending}
            aria-label={`Remove ${tag.name}`}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() =>
              persist(selected.filter((id) => id !== tag.id))
            }
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              size="xs"
              variant="ghost"
              className="h-7 gap-1 px-1.5 text-[12px] text-muted-foreground hover:text-foreground"
            />
          }
        >
          <Plus className="size-3" />
          Add tag
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 space-y-2 p-2">
          <ul className="max-h-40 space-y-0.5 overflow-y-auto">
            {tags.map((tag) => {
              const on = selected.includes(tag.id);
              return (
                <li key={tag.id}>
                  <button
                    type="button"
                    disabled={pending}
                    className={cn(
                      "flex w-full items-center rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-muted/70",
                      on && "bg-muted/50 font-medium"
                    )}
                    onClick={() =>
                      persist(
                        on
                          ? selected.filter((id) => id !== tag.id)
                          : [...selected, tag.id]
                      )
                    }
                  >
                    {tag.name}
                  </button>
                </li>
              );
            })}
            {tags.length === 0 ? (
              <li className="px-2 py-1.5 text-[12px] text-muted-foreground">
                No tags yet
              </li>
            ) : null}
          </ul>
          <div className="flex gap-1.5 border-t border-border/50 pt-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New tag"
              className="h-8"
              disabled={pending}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  create();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              disabled={pending || !newName.trim()}
              onClick={create}
            >
              Add
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
