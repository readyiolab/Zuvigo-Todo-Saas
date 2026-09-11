import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/modules/auth/auth.service";
import { getRecentPages, listPages } from "@/modules/pages/page.service";
import { listProjects } from "@/modules/projects/project.service";
import {
  getUserWorkspaces,
  getWorkspaceForUserBySlug,
} from "@/modules/workspaces/workspace.service";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  if (workspaceSlug === "new") {
    return children;
  }

  const user = await requireUser();
  const access = await getWorkspaceForUserBySlug(workspaceSlug, user.id).catch(
    () => null
  );
  if (!access) notFound();

  const workspaceId = access.workspace.id;
  const [workspaces, pages, recentPages, projects] = await Promise.all([
    getUserWorkspaces(user.id),
    listPages(workspaceId, user.id),
    getRecentPages(workspaceId, user.id, 8),
    listProjects(workspaceId, user.id),
  ]);

  return (
    <AppShell
      user={user}
      workspaces={workspaces}
      currentSlug={workspaceSlug}
      workspaceId={workspaceId}
      pages={pages}
      recentPages={recentPages}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
    >
      {children}
    </AppShell>
  );
}
