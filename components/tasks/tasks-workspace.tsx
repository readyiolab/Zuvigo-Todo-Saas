"use client";

import type { ReactNode } from "react";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ProjectRecord } from "@/modules/projects/project.types";
import type { TaskRecord } from "@/modules/tasks/task.types";
import { TaskList } from "@/components/tasks/task-list";
import { TaskBoard } from "@/components/tasks/task-board";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";

type MemberOption = { userId: string; name: string; email: string };

export function TasksWorkspace({
  workspaceId,
  workspaceSlug,
  tasks,
  selectedTask,
  selectedSubtasks = [],
  projects,
  members,
  view,
  canCreate,
  canMove,
  canEdit,
  canDelete,
  canInvite = false,
  defaultProjectId,
  defaultOpenCreate = false,
  selectedTaskId,
  emptyState = null,
  currentUserId,
}: {
  workspaceId: string;
  workspaceSlug: string;
  tasks: TaskRecord[];
  selectedTask: TaskRecord | null;
  selectedSubtasks?: TaskRecord[];
  projects: ProjectRecord[];
  members: MemberOption[];
  view: "list" | "board";
  canCreate: boolean;
  canMove: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canInvite?: boolean;
  defaultProjectId?: string | null;
  defaultOpenCreate?: boolean;
  selectedTaskId?: string;
  emptyState?: ReactNode;
  currentUserId?: string;
}) {
  const router = useRouter();

  const openTask = useCallback(
    (taskId: string) => {
      const params = new URLSearchParams(window.location.search);
      params.set("taskId", taskId);
      params.delete("new");
      router.push(`/w/${workspaceSlug}/tasks?${params.toString()}`, {
        scroll: false,
      });
    },
    [router, workspaceSlug]
  );

  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-6">
      <QuickAdd
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
        projects={projectOptions}
        defaultProjectId={defaultProjectId}
        canCreate={canCreate}
        autoFocus={defaultOpenCreate}
      />

      {view === "list" ? (
        tasks.length > 0 ? (
          <TaskList
            workspaceId={workspaceId}
            workspaceSlug={workspaceSlug}
            tasks={tasks}
            projects={projects}
            members={members}
            canComplete={canEdit}
            canEdit={canEdit}
            canDelete={canDelete}
            selectedTaskId={selectedTaskId}
            onOpenTask={openTask}
          />
        ) : (
          emptyState
        )
      ) : tasks.length > 0 ? (
        <TaskBoard
          workspaceId={workspaceId}
          workspaceSlug={workspaceSlug}
          tasks={tasks}
          canMove={canMove}
          onOpenTask={openTask}
        />
      ) : (
        emptyState
      )}

      <TaskDetailSheet
        open={Boolean(selectedTask)}
        task={selectedTask}
        subtasks={selectedSubtasks}
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
        projects={projects}
        members={members}
        canEdit={canEdit}
        canDelete={canDelete}
        canCreate={canCreate}
        canInvite={canInvite}
        currentUserId={currentUserId}
        onOpenChange={(open) => {
          if (open) return;
          const params = new URLSearchParams(window.location.search);
          params.delete("taskId");
          const qs = params.toString();
          router.push(`/w/${workspaceSlug}/tasks${qs ? `?${qs}` : ""}`, {
            scroll: false,
          });
        }}
      />
    </div>
  );
}
