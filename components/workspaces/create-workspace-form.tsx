"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createWorkspaceAction,
  type ActionResult,
} from "@/modules/workspaces/workspace.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { slugify } from "@/shared/utils/slug";
import { cn } from "@/lib/utils";

const WORKSPACE_TYPES = [
  {
    id: "education",
    label: "School & Education",
    desc: "For classes, study groups, assignments & notes",
    icon: "🎓",
  },
  {
    id: "work",
    label: "Work & Team",
    desc: "For companies, startups, clients & departments",
    icon: "💼",
  },
  {
    id: "personal",
    label: "Personal & Family",
    desc: "For personal tasks, family planning & hobbies",
    icon: "🏠",
  },
];

export function CreateWorkspaceForm({
  defaultBackUrl,
  defaultBackName,
}: {
  defaultBackUrl?: string;
  defaultBackName?: string;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    createWorkspaceAction,
    null
  );

  const [name, setName] = useState("");
  const [selectedType, setSelectedType] = useState("work");

  const currentSlug = slugify(name.trim() || "my-workspace");

  const currentTypeObj =
    WORKSPACE_TYPES.find((t) => t.id === selectedType) ?? WORKSPACE_TYPES[1];

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="icon" value={currentTypeObj.icon} />

      {/* Workspace Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-semibold text-foreground">
          Workspace name
        </Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Science Club, Acme Corp, or Family Tasks"
          required
          autoFocus
          className="h-11 rounded-lg border-border bg-background px-3.5 text-sm font-medium shadow-xs focus-visible:ring-2 focus-visible:ring-primary/20"
        />
        <p className="text-xs text-muted-foreground">
          This is the visible name of your workspace. You can change this anytime in Settings.
        </p>
      </div>

      {/* Workspace Address */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-foreground">
          Workspace address
        </Label>
        <div className="flex items-center rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
          <span className="shrink-0 text-muted-foreground select-none">
            zuvigo.app/w/
          </span>
          <span className="font-mono font-medium text-foreground ml-0.5 truncate">
            {currentSlug}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Your unique web address for accessing docs and tasks.
        </p>
      </div>

      {/* Workspace Type */}
      <div className="space-y-2.5">
        <Label className="text-sm font-semibold text-foreground">
          What will you use this workspace for?
        </Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {WORKSPACE_TYPES.map((type) => {
            const isSelected = selectedType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedType(type.id)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                    : "border-border bg-background text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{type.icon}</span>
                  <span className="text-xs font-semibold text-foreground">
                    {type.label}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {type.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error message */}
      {state && !state.success ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-border">
        {defaultBackUrl ? (
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto text-xs"
            render={<Link href={defaultBackUrl} />}
          >
            Cancel
          </Button>
        ) : null}

        <Button
          type="submit"
          className="w-full sm:w-auto px-6 font-semibold"
          disabled={pending}
        >
          {pending ? (
            <>
              <Spinner className="mr-2 size-3.5" />
              Creating workspace…
            </>
          ) : (
            "Create workspace"
          )}
        </Button>
      </div>
    </form>
  );
}
