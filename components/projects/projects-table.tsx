"use client";

import Link from "next/link";
import { FolderKanban } from "lucide-react";
import type { ProjectRecord, ProjectStatus } from "@/modules/projects/project.types";
import { DataTable } from "@/components/layout/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import {
  PROJECT_STATUS_TONE,
  SOFT_TONE_VARIANT,
} from "@/components/shared/status-styles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateLocal, formatDueDate } from "@/lib/date";

export function ProjectsTable({
  projects,
  workspaceSlug,
  canCreate,
  showEmptyState,
}: {
  projects: ProjectRecord[];
  workspaceSlug: string;
  canCreate?: boolean;
  showEmptyState?: boolean;
}) {
  return (
    <DataTable
      rows={projects}
      getRowHref={(p) => `/w/${workspaceSlug}/projects/${p.id}`}
      getRowId={(p) => p.id}
      columns={[
        {
          key: "name",
          header: "Project",
          searchValue: (p) => `${p.name} ${p.description ?? ""}`,
          cell: (p) => (
            <div className="space-y-0.5">
              <p className="truncate font-medium">{p.name}</p>
              {p.description ? (
                <p className="line-clamp-2 text-caption text-muted-foreground">
                  {p.description}
                </p>
              ) : null}
            </div>
          ),
        },
        {
          key: "status",
          header: "Status",
          searchValue: (p) => p.status,
          cell: (p) => {
            const tone = PROJECT_STATUS_TONE[p.status as ProjectStatus];
            return (
              <Badge variant={SOFT_TONE_VARIANT[tone]} className="capitalize">
                {p.status.replaceAll("_", " ")}
              </Badge>
            );
          },
        },
        {
          key: "due",
          header: "Due",
          searchValue: (p) => p.dueDate ?? "",
          cell: (p) =>
            p.dueDate ? (
              <span className="text-caption font-medium">
                {formatDueDate(p.dueDate)}
              </span>
            ) : (
              <span className="text-caption text-muted-foreground/60">—</span>
            ),
        },
        {
          key: "updated",
          header: "Updated",
          searchValue: (p) =>
            p.updatedAt ? formatDateLocal(p.updatedAt) : "",
          cell: (p) => {
            if (!p.updatedAt) {
              return (
                <span className="text-caption text-muted-foreground/60">—</span>
              );
            }
            return (
              <span className="text-caption text-muted-foreground">
                {formatDateLocal(p.updatedAt)}
              </span>
            );
          },
        },
      ]}
      emptyState={
        showEmptyState ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create a project to organize tasks."
            action={
              canCreate ? (
                <Button
                  size="sm"
                  render={
                    <Link href={`/w/${workspaceSlug}/projects?new=1`} />
                  }
                >
                  New project
                </Button>
              ) : undefined
            }
          />
        ) : null
      }
    />
  );
}
