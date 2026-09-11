import Link from "next/link";
import { requireUser } from "@/modules/auth/auth.service";
import { listProjects } from "@/modules/projects/project.service";
import { roleHasPermission } from "@/modules/workspaces/workspace.permissions";
import { getWorkspaceForUserBySlug } from "@/modules/workspaces/workspace.service";

import { PageHeader } from "@/components/layout/page-header";
import { Screen } from "@/components/layout/screen";
import { ProjectForm } from "@/components/projects/project-form";
import { ProjectsTable } from "@/components/projects/projects-table";
import { Button } from "@/components/ui/button";

export default async function ProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { workspaceSlug } = await params;
  const { new: showNew } = await searchParams;

  const user = await requireUser();
  const { workspace, membership } = await getWorkspaceForUserBySlug(
    workspaceSlug,
    user.id
  );

  const projects = await listProjects(workspace.id, user.id);
  const canCreate = roleHasPermission(membership.role, "projects.create");

  const action = canCreate ? (
    <Button
      size="sm"
      variant={showNew ? "outline" : "default"}
      render={
        <Link
          href={
            showNew
              ? `/w/${workspaceSlug}/projects`
              : `/w/${workspaceSlug}/projects?new=1`
          }
        />
      }
    >
      {showNew ? "Cancel" : "New project"}
    </Button>
  ) : undefined;

  const hideTable = Boolean(showNew) && projects.length === 0;
  const showEmptyState = projects.length === 0 && !showNew;

  return (
    <Screen>
      <PageHeader
        breadcrumbs={[
          { label: workspace.name, href: `/w/${workspaceSlug}` },
          { label: "Projects" },
        ]}
        title="Projects"
        description={`${projects.length} project${projects.length === 1 ? "" : "s"}`}
        actions={action}
      />

      {showNew && canCreate ? (
        <ProjectForm
          workspaceId={workspace.id}
          workspaceSlug={workspaceSlug}
        />
      ) : null}

      {!hideTable ? (
        <ProjectsTable
          projects={projects}
          workspaceSlug={workspaceSlug}
          canCreate={canCreate}
          showEmptyState={showEmptyState}
        />
      ) : null}
    </Screen>
  );
}
