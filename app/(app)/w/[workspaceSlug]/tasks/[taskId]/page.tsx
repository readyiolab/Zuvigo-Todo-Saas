import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/auth.service";
import {
  getWorkspaceForUserBySlug,
  getWorkspaceMembers,
} from "@/modules/workspaces/workspace.service";
import { listProjects } from "@/modules/projects/project.service";
import { getTask, listTasks } from "@/modules/tasks/task.service";
import { roleHasPermission } from "@/modules/workspaces/workspace.permissions";
import { Screen } from "@/components/layout/screen";
import { PageHeader } from "@/components/layout/page-header";
import { TaskDetail } from "@/components/tasks/task-detail";
import { formatDateLocal } from "@/lib/date";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; taskId: string }>;
}) {
  const { workspaceSlug, taskId } = await params;
  const user = await requireUser();
  const { workspace, membership } = await getWorkspaceForUserBySlug(
    workspaceSlug,
    user.id
  );

  let task;
  try {
    task = await getTask(workspace.id, taskId, user.id);
  } catch {
    notFound();
  }

  const [projects, members, subtasks] = await Promise.all([
    listProjects(workspace.id, user.id),
    getWorkspaceMembers(workspace.id, user.id),
    listTasks(workspace.id, user.id, { parentTaskId: taskId }),
  ]);

  return (
    <Screen>
      <PageHeader
        className="[&_h1]:sr-only"
        breadcrumbs={[
          { label: workspace.name, href: `/w/${workspaceSlug}` },
          { label: "Tasks", href: `/w/${workspaceSlug}/tasks` },
          { label: task.title },
        ]}
        title="Task details"
        description={
          task.completedAt
            ? `Done ${formatDateLocal(task.completedAt)}`
            : `Updated ${formatDateLocal(task.updatedAt)}`
        }
      />
      <div className="mx-auto w-full max-w-5xl xl:max-w-6xl pb-16">
        <TaskDetail
          workspaceId={workspace.id}
          workspaceSlug={workspaceSlug}
          task={task}
          projects={projects}
          members={members.map((m) => ({
            userId: m.userId,
            name: m.name,
            email: m.email,
          }))}
          canEdit={roleHasPermission(membership.role, "tasks.update")}
          canDelete={roleHasPermission(membership.role, "tasks.delete")}
          canCreate={roleHasPermission(membership.role, "tasks.create")}
          canInvite={roleHasPermission(membership.role, "members.invite")}
          subtasks={subtasks}
          variant="page"
          currentUserId={user.id}
        />
      </div>
    </Screen>
  );
}
