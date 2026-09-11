"use client";

import { useState, useTransition } from "react";
import { createTaskAction } from "@/modules/tasks/task.actions";
import type { ProjectRecord } from "@/modules/projects/project.types";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "@/modules/tasks/task.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AssigneePicker } from "@/components/tasks/assignee-picker";

type MemberOption = { userId: string; name: string; email: string };

export function TaskForm({
  workspaceId,
  workspaceSlug,
  projects,
  members,
  defaultProjectId = null,
  canInvite = false,
}: {
  workspaceId: string;
  workspaceSlug: string;
  projects: ProjectRecord[];
  members: MemberOption[];
  defaultProjectId?: string | null;
  canInvite?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [projectId, setProjectId] = useState<string>(defaultProjectId ?? "");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  return (
    <form
      className="space-y-4 rounded-md border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await createTaskAction({
            workspaceId,
            workspaceSlug,
            title: String(data.get("title") ?? ""),
            description: String(data.get("description") ?? "") || null,
            projectId: projectId || null,
            status,
            priority,
            dueAt: String(data.get("dueAt") ?? "") || null,
            assigneeIds,
          });
          if (result && !result.success) {
            setError(result.error.message);
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required disabled={pending} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          disabled={pending}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Project</Label>
          <Select
            value={projectId || "__none"}
            onValueChange={(v) =>
              setProjectId(v === "__none" || !v ? "" : String(v))
            }
          >
            <SelectTrigger className="w-full">
              <span className="flex-1 truncate text-left">
                {projectId
                  ? projects.find((p) => p.id === projectId)?.name ?? "Project"
                  : "No project"}
              </span>
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
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueAt">Due</Label>
          <Input
            id="dueAt"
            name="dueAt"
            type="datetime-local"
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(v) => {
              if (v) setStatus(v as TaskStatus);
            }}
          >
            <SelectTrigger className="w-full">
              <span className="flex-1 truncate text-left">
                {TASK_STATUS_LABELS[status]}
              </span>
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {TASK_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={priority}
            onValueChange={(v) => {
              if (v) setPriority(v as TaskPriority);
            }}
          >
            <SelectTrigger className="w-full">
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
        </div>
      </div>
      <div className="space-y-2">
        <Label>Assignees</Label>
        <AssigneePicker
          members={members}
          value={assigneeIds}
          onChange={setAssigneeIds}
          disabled={pending}
          workspaceId={workspaceId}
          canInvite={canInvite}
        />
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
          "Create task"
        )}
      </Button>
    </form>
  );
}
