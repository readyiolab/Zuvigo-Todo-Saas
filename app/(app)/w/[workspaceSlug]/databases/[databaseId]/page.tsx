import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/auth.service";
import { getDatabase } from "@/modules/databases/database.service";
import { getWorkspaceForUserBySlug } from "@/modules/workspaces/workspace.service";
import { DatabaseWorkspace } from "@/components/databases/database-workspace";
import { PageHeader } from "@/components/layout/page-header";
import { Screen } from "@/components/layout/screen";

export default async function DatabaseDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; databaseId: string }>;
}) {
  const { workspaceSlug, databaseId } = await params;
  const user = await requireUser();
  const access = await getWorkspaceForUserBySlug(workspaceSlug, user.id).catch(
    () => null
  );
  if (!access) notFound();

  let detail;
  try {
    detail = await getDatabase(access.workspace.id, databaseId, user.id);
  } catch {
    notFound();
  }

  return (
    <Screen>
      <PageHeader
        title={detail.database.name}
        description={detail.database.description ?? "Database"}
        breadcrumbs={[
          { label: "Databases", href: `/w/${workspaceSlug}/databases` },
          { label: detail.database.name },
        ]}
      />
      <DatabaseWorkspace
        key={`${detail.database.id}-${detail.rows.length}`}
        workspaceId={access.workspace.id}
        workspaceSlug={workspaceSlug}
        databaseId={detail.database.id}
        properties={detail.properties}
        views={detail.views}
        rows={detail.rows}
      />
    </Screen>
  );
}
