import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckSquare } from "lucide-react";
import { requireUser } from "@/modules/auth/auth.service";
import { getWorkspaceForUserBySlug } from "@/modules/workspaces/workspace.service";
import { getProject } from "@/modules/projects/project.service";
import { listTasks } from "@/modules/tasks/task.service";
import { roleHasPermission } from "@/modules/workspaces/workspace.permissions";
import { Screen } from "@/components/layout/screen";
import { EmptyState } from "@/components/shared/empty-state";
import { ProjectHeader } from "@/components/projects/project-header";
import { TaskBoard } from "@/components/tasks/task-board";
import { TaskList } from "@/components/tasks/task-list";
import { QuickAdd } from "@/components/tasks/quick-add";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "list", label: "List" },
  { key: "board", label: "Board" },
  { key: "calendar", label: "Calendar" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function isTab(value: string | undefined): value is TabKey {
  return !!value && TABS.some((t) => t.key === value);
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { workspaceSlug, projectId } = await params;
  const sp = await searchParams;
  const view: TabKey = isTab(sp.view) ? sp.view : "overview";
  const user = await requireUser();
  const { workspace, membership } = await getWorkspaceForUserBySlug(
    workspaceSlug,
    user.id
  );

  let project;
  try {
    project = await getProject(workspace.id, projectId, user.id);
  } catch {
    notFound();
  }

  const tasks = await listTasks(workspace.id, user.id, { projectId });
  const canEdit = roleHasPermission(membership.role, "projects.update");
  const canDelete = roleHasPermission(membership.role, "projects.delete");
  const canCreateTask = roleHasPermission(membership.role, "tasks.create");
  const canMove = roleHasPermission(membership.role, "tasks.update");
  const completed = tasks.filter((t) => t.status === "completed").length;
  const progress =
    tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);
  const base = `/w/${workspaceSlug}/projects/${projectId}`;

  return (
    <Screen density="wide">
      <ProjectHeader
        workspaceId={workspace.id}
        workspaceSlug={workspaceSlug}
        project={project}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="soft">{tasks.length} tasks</Badge>
        <Badge variant="success">{progress}% done</Badge>
        {canCreateTask ? (
          <Button
            size="sm"
            className="ml-auto"
            render={
              <Link
                href={`/w/${workspaceSlug}/tasks?new=1&projectId=${projectId}`}
              />
            }
          >
            New task
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-muted/20 p-1">
        {TABS.map((tab) => (
          <Button
            key={tab.key}
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 rounded-md",
              view === tab.key &&
                "bg-background text-foreground shadow-subtle hover:bg-background"
            )}
            render={
              <Link
                href={
                  tab.key === "calendar"
                    ? `/w/${workspaceSlug}/calendar`
                    : `${base}?view=${tab.key}`
                }
              />
            }
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {view === "overview" ? (
        <div className="space-y-4">
          <QuickAdd
            workspaceId={workspace.id}
            workspaceSlug={workspaceSlug}
            projects={[{ id: project.id, name: project.name }]}
            defaultProjectId={project.id}
            canCreate={canCreateTask}
            placeholder={`Add a task to ${project.name}…`}
          />
          {tasks.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No tasks in this project"
              description="Create your first task to start tracking progress."
            />
          ) : (
            <TaskList
              workspaceId={workspace.id}
              workspaceSlug={workspaceSlug}
              tasks={tasks.slice(0, 12)}
              canComplete={canMove}
            />
          )}
        </div>
      ) : null}

      {view === "list" ? (
        <div className="space-y-3">
          <QuickAdd
            workspaceId={workspace.id}
            workspaceSlug={workspaceSlug}
            projects={[{ id: project.id, name: project.name }]}
            defaultProjectId={project.id}
            canCreate={canCreateTask}
          />
          {tasks.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No tasks yet"
              description="Add a task above to populate this list."
            />
          ) : (
            <TaskList
              workspaceId={workspace.id}
              workspaceSlug={workspaceSlug}
              tasks={tasks}
              canComplete={canMove}
            />
          )}
        </div>
      ) : null}

      {view === "board" ? (
        <TaskBoard
          workspaceId={workspace.id}
          workspaceSlug={workspaceSlug}
          tasks={tasks}
          canMove={canMove}
        />
      ) : null}
    </Screen>
  );
}
