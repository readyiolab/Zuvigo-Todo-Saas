import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckSquare, FilterX } from "lucide-react";
import { requireUser } from "@/modules/auth/auth.service";
import {
  getWorkspaceForUserBySlug,
  getWorkspaceMembers,
  listPendingWorkspaceInvites,
} from "@/modules/workspaces/workspace.service";
import { listProjects } from "@/modules/projects/project.service";
import { listTasks, getTask } from "@/modules/tasks/task.service";
import { roleHasPermission } from "@/modules/workspaces/workspace.permissions";
import {
  isTaskDueFilter,
  isTaskPriority,
  isTaskSort,
  isTaskStatus,
  type TaskDueFilter,
  type TaskPriority,
  type TaskSort,
  type TaskStatus,
} from "@/modules/tasks/task.types";
import { Screen } from "@/components/layout/screen";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { TasksFilters } from "@/components/tasks/tasks-filters";
import { TasksWorkspace } from "@/components/tasks/tasks-workspace";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PRESETS = [
  { key: "all", label: "All" },
  { key: "assigned", label: "Assigned to me" },
  { key: "created", label: "Created by me" },
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Due today" },
  { key: "upcoming", label: "Coming up" },
  { key: "completed", label: "Done" },
  { key: "cancelled", label: "Cancelled" },
] as const;

type PresetKey = (typeof PRESETS)[number]["key"];

function isPreset(value: string | undefined): value is PresetKey {
  return !!value && PRESETS.some((p) => p.key === value);
}

function normalizePreset(value: string | undefined): PresetKey {
  if (value === "mine") return "assigned";
  if (isPreset(value)) return value;
  return "all";
}

export default async function TasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{
    view?: string;
    projectId?: string;
    status?: string;
    assigneeId?: string;
    priority?: string;
    due?: string;
    sort?: string;
    q?: string;
    taskId?: string;
    new?: string;
    preset?: string;
  }>;
}) {
  const { workspaceSlug } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const access = await getWorkspaceForUserBySlug(workspaceSlug, user.id).catch(
    () => null
  );
  if (!access) notFound();
  const { workspace, membership } = access;

  const view = sp.view === "board" ? "board" : "list";
  const projectId = sp.projectId || undefined;
  const preset: PresetKey = normalizePreset(sp.preset);
  let status: TaskStatus | undefined = isTaskStatus(sp.status)
    ? sp.status
    : undefined;
  const priority: TaskPriority | undefined = isTaskPriority(sp.priority)
    ? sp.priority
    : undefined;
  let due: TaskDueFilter | undefined = isTaskDueFilter(sp.due)
    ? sp.due
    : undefined;
  const sort: TaskSort | undefined = isTaskSort(sp.sort) ? sp.sort : undefined;
  let assigneeId = sp.assigneeId || undefined;
  let createdBy: string | undefined;
  const q = sp.q?.trim() || undefined;
  const taskId = sp.taskId || undefined;
  const openCreate = sp.new === "1";

  if (preset === "assigned") {
    assigneeId = user.id;
  } else if (preset === "created") {
    createdBy = user.id;
  } else if (preset === "overdue") {
    due = "overdue";
  } else if (preset === "today") {
    due = "today";
  } else if (preset === "upcoming") {
    due = "upcoming";
  } else if (preset === "completed") {
    due = "completed";
    status = undefined;
  } else if (preset === "cancelled") {
    due = "cancelled";
    status = undefined;
  }

  const hasFilters = Boolean(
    projectId ||
      status ||
      assigneeId ||
      priority ||
      due ||
      q ||
      sort ||
      createdBy ||
      (preset && preset !== "all")
  );

  const canManageMembers = roleHasPermission(membership.role, "members.invite");

  const [projects, tasks, members, pendingInvites] = await Promise.all([
    listProjects(workspace.id, user.id),
    listTasks(workspace.id, user.id, {
      projectId,
      status,
      assigneeId,
      createdBy,
      priority,
      due,
      sort,
      q,
    }),
    getWorkspaceMembers(workspace.id, user.id),
    canManageMembers
      ? listPendingWorkspaceInvites(workspace.id, user.id)
      : Promise.resolve([]),
  ]);

  let selectedTask = taskId
    ? tasks.find((t) => t.id === taskId) ?? null
    : null;
  if (taskId && !selectedTask) {
    try {
      selectedTask = await getTask(workspace.id, taskId, user.id);
    } catch {
      selectedTask = null;
    }
  }

  let selectedSubtasks: Awaited<ReturnType<typeof listTasks>> = [];
  if (selectedTask) {
    selectedSubtasks = await listTasks(workspace.id, user.id, {
      parentTaskId: selectedTask.id,
    });
  }

  const canCreate = roleHasPermission(membership.role, "tasks.create");
  const canMove = roleHasPermission(membership.role, "tasks.update");
  const canEdit = roleHasPermission(membership.role, "tasks.update");
  const canDelete = roleHasPermission(membership.role, "tasks.delete");
  const memberOptions = members.map((m) => ({
    userId: m.userId,
    name: m.name,
    email: m.email,
  }));

  const baseQuery = new URLSearchParams();
  if (projectId) baseQuery.set("projectId", projectId);
  if (status) baseQuery.set("status", status);
  if (assigneeId && preset === "all") baseQuery.set("assigneeId", assigneeId);
  if (priority) baseQuery.set("priority", priority);
  if (due && preset === "all") baseQuery.set("due", due);
  if (sort && sort !== "status") baseQuery.set("sort", sort);
  if (q) baseQuery.set("q", q);
  if (taskId) baseQuery.set("taskId", taskId);
  if (preset && preset !== "all") baseQuery.set("preset", preset);

  const listHref = `/w/${workspaceSlug}/tasks${(() => {
    const p = new URLSearchParams(baseQuery);
    p.delete("view");
    const qs = p.toString();
    return qs ? `?${qs}` : "";
  })()}`;
  const boardQuery = new URLSearchParams(baseQuery);
  boardQuery.set("view", "board");
  const boardHref = `/w/${workspaceSlug}/tasks?${boardQuery}`;

  const clearFiltersHref =
    view === "board"
      ? `/w/${workspaceSlug}/tasks?view=board`
      : `/w/${workspaceSlug}/tasks`;

  function presetHref(key: PresetKey) {
    const p = new URLSearchParams();
    if (view === "board") p.set("view", "board");
    if (projectId) p.set("projectId", projectId);
    if (key !== "all") p.set("preset", key);
    if (taskId) p.set("taskId", taskId);
    const qs = p.toString();
    return `/w/${workspaceSlug}/tasks${qs ? `?${qs}` : ""}`;
  }

  const countLabel = `${tasks.length} task${tasks.length === 1 ? "" : "s"}`;

  return (
    <Screen className="max-w-[1400px] space-y-8">
      <PageHeader
        className="space-y-5"
        breadcrumbs={[
          { label: workspace.name, href: `/w/${workspaceSlug}` },
          { label: "Tasks" },
        ]}
        title="Tasks"
        titleClassName="text-[1.75rem] leading-8 font-semibold sm:text-[2rem] sm:leading-9"
        description={countLabel}
        actions={
          <div className="inline-flex h-9 items-center rounded-lg border border-border/60 bg-muted/40 p-0.5">
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "h-8 rounded-md px-3 text-caption font-medium",
                view === "list"
                  ? "bg-background text-foreground shadow-subtle hover:bg-background"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
              render={<Link href={listHref} />}
            >
              List
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "h-8 rounded-md px-3 text-caption font-medium",
                view === "board"
                  ? "bg-background text-foreground shadow-subtle hover:bg-background"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
              render={<Link href={boardHref} />}
            >
              Board
            </Button>
          </div>
        }
        tabs={
          <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PRESETS.map((p) => (
              <Link
                key={p.key}
                href={presetHref(p.key)}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center rounded-md px-2.5 text-caption font-medium transition-colors",
                  preset === p.key
                    ? "bg-primary-soft text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {p.label}
              </Link>
            ))}
          </div>
        }
        toolbar={
          <div className="space-y-3">
            <TasksFilters
              workspaceSlug={workspaceSlug}
              view={view}
              projects={projects}
              members={memberOptions}
              projectId={projectId}
              status={status}
              assigneeId={assigneeId}
              priority={priority}
              due={due}
              sort={sort}
              q={q}
              taskId={taskId}
            />
            {canManageMembers && pendingInvites.length > 0 ? (
              <p className="text-caption text-muted-foreground">
                Waiting for these people to join:{" "}
                {pendingInvites.map((i) => i.email).join(", ")}
                {" · "}
                <Link
                  href={`/w/${workspaceSlug}/settings`}
                  className="font-medium text-primary hover:underline"
                >
                  Invite more in Settings
                </Link>
              </p>
            ) : null}
          </div>
        }
      />

      <TasksWorkspace
        workspaceId={workspace.id}
        workspaceSlug={workspaceSlug}
        tasks={tasks}
        selectedTask={selectedTask}
        selectedSubtasks={selectedSubtasks}
        projects={projects}
        members={memberOptions}
        view={view}
        canCreate={canCreate}
        canMove={canMove}
        canEdit={canEdit}
        canDelete={canDelete}
        canInvite={canManageMembers}
        defaultProjectId={projectId ?? null}
        defaultOpenCreate={openCreate}
        selectedTaskId={taskId}
        currentUserId={user.id}
        emptyState={
          tasks.length === 0 ? (
            <EmptyState
              icon={hasFilters ? FilterX : CheckSquare}
              title={hasFilters ? "Nothing matches" : "No tasks yet"}
              description={
                hasFilters
                  ? "Clear filters and try again."
                  : "Create a task above to get started."
              }
              action={
                hasFilters ? (
                  <Button
                    size="sm"
                    variant="outline"
                    render={<Link href={clearFiltersHref} />}
                  >
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : null
        }
      />
    </Screen>
  );
}
