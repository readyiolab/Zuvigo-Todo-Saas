import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/auth.service";
import { getWorkspaceSubscription } from "@/modules/billing/billing.service";
import { getPage, trackPageVisit } from "@/modules/pages/page.service";
import { getWorkspaceForUserBySlug } from "@/modules/workspaces/workspace.service";
import { roleHasPermission } from "@/modules/workspaces/workspace.permissions";
import { DocumentTitleBar } from "@/components/pages/document-title-bar";
import { PageEditor } from "@/components/editor/page-editor";
import { Screen } from "@/components/layout/screen";

export default async function PageDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; pageId: string }>;
}) {
  const { workspaceSlug, pageId } = await params;
  const user = await requireUser();
  const { workspace, membership } = await getWorkspaceForUserBySlug(
    workspaceSlug,
    user.id
  );

  let payload;
  try {
    payload = await getPage(workspace.id, pageId, user.id);
  } catch {
    notFound();
  }

  void trackPageVisit(workspace.id, pageId, user.id).catch(() => undefined);

  const canEdit = roleHasPermission(membership.role, "pages.update");
  const canDelete = roleHasPermission(membership.role, "pages.delete");
  const canInvite = roleHasPermission(membership.role, "members.invite");
  const subscription = await getWorkspaceSubscription(workspace.id);

  return (
    <Screen density="prose">
      <DocumentTitleBar
        workspaceId={workspace.id}
        workspaceSlug={workspaceSlug}
        pageId={payload.page.id}
        title={payload.page.title}
        icon={payload.page.icon}
        isFavorite={payload.page.isFavorite}
        canEdit={canEdit}
        canDelete={canDelete}
        canInvite={canInvite}
        plan={subscription.plan}
      />
      <PageEditor
        key={payload.page.id}
        workspaceId={workspace.id}
        pageId={payload.page.id}
        initialBlocks={payload.blocks}
        editable={canEdit}
      />
    </Screen>
  );
}
