import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/auth.service";
import { listTrash } from "@/modules/pages/page.service";
import { getWorkspaceForUserBySlug } from "@/modules/workspaces/workspace.service";
import { TrashList } from "@/components/pages/trash-list";
import { PageHeader } from "@/components/layout/page-header";
import { Screen } from "@/components/layout/screen";

export default async function TrashPage({
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

  const pages = await listTrash(access.workspace.id, user.id);

  return (
    <Screen>
      <PageHeader
        title="Trash"
        description="Restore pages or delete them permanently."
      />
      <TrashList
        workspaceId={access.workspace.id}
        workspaceSlug={workspaceSlug}
        pages={pages}
      />
    </Screen>
  );
}
