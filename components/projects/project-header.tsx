"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  deleteProjectAction,
  updateProjectAction,
} from "@/modules/projects/project.actions";
import type {
  ProjectRecord,
  ProjectStatus,
} from "@/modules/projects/project.types";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";

const STATUSES: ProjectStatus[] = [
  "planned",
  "active",
  "on_hold",
  "completed",
  "archived",
];

export function ProjectHeader({
  workspaceId,
  workspaceSlug,
  project,
  canEdit,
  canDelete,
}: {
  workspaceId: string;
  workspaceSlug: string;
  project: ProjectRecord;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [startDate, setStartDate] = useState(project.startDate ?? "");
  const [dueDate, setDueDate] = useState(project.dueDate ?? "");

  function save() {
    if (!canEdit) return;
    startTransition(async () => {
      await updateProjectAction({
        workspaceId,
        workspaceSlug,
        projectId: project.id,
        name,
        description: description || null,
        status,
        startDate: startDate || null,
        dueDate: dueDate || null,
      });
    });
  }

  return (
    <div className="space-y-4 border-b pb-4">
      <div className="flex items-start justify-between gap-3">
        <Input
          value={name}
          disabled={!canEdit || pending}
          onChange={(e) => setName(e.target.value)}
          onBlur={save}
          className="border-0 px-0 text-title shadow-none focus-visible:ring-0"
          aria-label="Project name"
        />
        {canDelete ? (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button type="button" size="icon-sm" variant="ghost" />}
              >
                <MoreHorizontal className="size-4" />
                <span className="sr-only">More</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  Archive project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogContent className="rounded-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-title normal-case tracking-normal">
                    Archive this project?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-body">
                    The project will be archived. Tasks stay linked but the
                    project disappears from the active list.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => {
                      startTransition(async () => {
                        await deleteProjectAction({
                          workspaceId,
                          workspaceSlug,
                          projectId: project.id,
                        });
                      });
                    }}
                  >
                    Archive
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          disabled={!canEdit || pending}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={save}
          rows={3}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={status}
            disabled={!canEdit || pending}
            onValueChange={(v) => {
              if (!v) return;
              setStatus(v as ProjectStatus);
              startTransition(async () => {
                await updateProjectAction({
                  workspaceId,
                  workspaceSlug,
                  projectId: project.id,
                  status: v,
                });
              });
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
          <Input
            id="startDate"
            type="date"
            value={startDate}
            disabled={!canEdit || pending}
            onChange={(e) => setStartDate(e.target.value)}
            onBlur={save}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due</Label>
          <Input
            id="dueDate"
            type="date"
            value={dueDate}
            disabled={!canEdit || pending}
            onChange={(e) => setDueDate(e.target.value)}
            onBlur={save}
          />
        </div>
      </div>
      {pending ? (
        <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
          <Spinner className="size-3" /> Saving…
        </p>
      ) : null}
    </div>
  );
}
