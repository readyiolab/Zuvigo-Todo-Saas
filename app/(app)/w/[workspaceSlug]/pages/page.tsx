import Link from "next/link";
import { FileText } from "lucide-react";
import { requireUser } from "@/modules/auth/auth.service";
import { listPages } from "@/modules/pages/page.service";
import { getWorkspaceForUserBySlug } from "@/modules/workspaces/workspace.service";
import { createPageAction } from "@/modules/pages/page.actions";
import { Screen, ScreenHeader } from "@/components/layout/screen";
import { ListContainer, ListRow } from "@/components/layout/list-row";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default async function PagesIndexPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const user = await requireUser();
  const { workspace } = await getWorkspaceForUserBySlug(workspaceSlug, user.id);
  const pages = await listPages(workspace.id, user.id);

  const flat: Array<{ id: string; title: string; icon: string | null }> = [];
  const walk = (nodes: typeof pages) => {
    for (const n of nodes) {
      flat.push({ id: n.id, title: n.title, icon: n.icon });
      walk(n.children);
    }
  };
  walk(pages);

  return (
    <Screen>
      <ScreenHeader
        title="Pages"
        description={`${flat.length} page${flat.length === 1 ? "" : "s"}`}
        action={
          <form
            action={async () => {
              "use server";
              await createPageAction({
                workspaceId: workspace.id,
                workspaceSlug,
              });
            }}
          >
            <Button type="submit" size="sm">
              New page
            </Button>
          </form>
        }
      />

      {flat.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No pages yet"
          description="Create your first page to start writing."
          action={
            <form
              action={async () => {
                "use server";
                await createPageAction({
                  workspaceId: workspace.id,
                  workspaceSlug,
                });
              }}
            >
              <Button type="submit" size="sm">
                New page
              </Button>
            </form>
          }
        />
      ) : (
        <ListContainer>
          {flat.map((page) => (
            <ListRow
              key={page.id}
              href={`/w/${workspaceSlug}/pages/${page.id}`}
            >
              <span className="flex items-center gap-2">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {page.icon ? `${page.icon} ` : ""}
                  {page.title}
                </span>
              </span>
            </ListRow>
          ))}
        </ListContainer>
      )}
    </Screen>
  );
}
