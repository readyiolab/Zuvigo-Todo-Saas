import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/auth.service";
import { listDatabases } from "@/modules/databases/database.service";
import { getWorkspaceForUserBySlug } from "@/modules/workspaces/workspace.service";
import { CreateDatabaseButton } from "@/components/databases/create-database-button";
import { DatabasesList } from "@/components/databases/databases-list";
import { PageHeader } from "@/components/layout/page-header";
import { Screen } from "@/components/layout/screen";

export default async function DatabasesPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const user = await requireUser();
  const access = await getWorkspaceForUserBySlug(workspaceSlug, user.id).catch(
    () => null
  );
  if (!access) notFound();

  const databases = await listDatabases(access.workspace.id, user.id);

  return (
    <Screen>
      <PageHeader
        title="Databases"
        description="Flexible properties with table and board views."
        actions={
          databases.length > 0 ? (
            <CreateDatabaseButton
              workspaceId={access.workspace.id}
              workspaceSlug={workspaceSlug}
            />
          ) : null
        }
      />
      <DatabasesList
        workspaceId={access.workspace.id}
        workspaceSlug={workspaceSlug}
        databases={databases}
      />
    </Screen>
  );
}
