"use client";

import { useState, useTransition } from "react";
import { createProjectAction } from "@/modules/projects/project.actions";
import type { ProjectStatus } from "@/modules/projects/project.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";

const STATUSES: ProjectStatus[] = [
  "planned",
  "active",
  "on_hold",
  "completed",
  "archived",
];

export function ProjectForm({
  workspaceId,
  workspaceSlug,
}: {
  workspaceId: string;
  workspaceSlug: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ProjectStatus>("planned");

  return (
    <form
      className="space-y-4 rounded-md border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        setError(null);
        startTransition(async () => {
          const result = await createProjectAction({
            workspaceId,
            workspaceSlug,
            name: String(data.get("name") ?? ""),
            description: String(data.get("description") ?? "") || null,
            status,
            startDate: String(data.get("startDate") ?? "") || null,
            dueDate: String(data.get("dueDate") ?? "") || null,
          });
          if (result && !result.success) {
            setError(result.error.message);
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required disabled={pending} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} disabled={pending} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(v) => {
              if (v) setStatus(v as ProjectStatus);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="startDate">Start</Label>
          <Input id="startDate" name="startDate" type="date" disabled={pending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due</Label>
          <Input id="dueDate" name="dueDate" type="date" disabled={pending} />
        </div>
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Spinner className="size-3.5" />
            Creating…
          </>
        ) : (
          "Create project"
        )}
      </Button>
    </form>
  );
}
