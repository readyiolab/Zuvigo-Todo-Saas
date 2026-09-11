import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/auth.service";
import { getWorkspaceForUserBySlug } from "@/modules/workspaces/workspace.service";
import { getTask } from "@/modules/tasks/task.service";
import { FocusTimer } from "@/components/productivity/focus-timer";
import { Screen } from "@/components/layout/screen";

export default async function FocusPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; taskId: string }>;
}) {
  const { workspaceSlug, taskId } = await params;
  const user = await requireUser();
  const { workspace } = await getWorkspaceForUserBySlug(workspaceSlug, user.id);
  const task = await getTask(workspace.id, taskId, user.id);
  if (!task) notFound();

  return (
    <Screen>
      <FocusTimer
        workspaceId={workspace.id}
        workspaceSlug={workspaceSlug}
        taskId={task.id}
        title={task.title}
        description={task.description}
        estimatedDurationMinutes={task.estimatedDurationMinutes}
        focusStartedAt={
          task.focusStartedAt
            ? new Date(task.focusStartedAt).toISOString()
            : null
        }
        actualDurationMinutes={task.actualDurationMinutes}
      />
    </Screen>
  );
}
