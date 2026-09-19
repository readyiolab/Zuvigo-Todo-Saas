import Link from "next/link";
import { FilePlus, FileText, Plus } from "lucide-react";
import { requireUser } from "@/modules/auth/auth.service";
import { listPages } from "@/modules/pages/page.service";
import { getWorkspaceForUserBySlug } from "@/modules/workspaces/workspace.service";
import { createPageAction } from "@/modules/pages/page.actions";
import { Screen, ScreenHeader } from "@/components/layout/screen";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function PagesIndexPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const user = await requireUser();
  const { workspace } = await getWorkspaceForUserBySlug(workspaceSlug, user.id);
  const pages = await listPages(workspace.id, user.id);

  const flat: Array<{
    id: string;
    title: string;
    icon: string | null;
    depth: number;
    parentTitle?: string;
  }> = [];

  const walk = (nodes: typeof pages, depth = 0, parentTitle?: string) => {
    for (const n of nodes) {
      flat.push({
        id: n.id,
        title: n.title,
        icon: n.icon,
        depth,
        parentTitle,
      });
      walk(n.children, depth + 1, n.title);
    }
  };
  walk(pages);

  return (
    <Screen>
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        <ScreenHeader
          title="Documents"
          description={`${flat.length} page${flat.length === 1 ? "" : "s"} in workspace`}
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
              <Button type="submit" size="sm" className="gap-1.5 h-8">
                <Plus className="size-3.5" />
                <span>New page</span>
              </Button>
            </form>
          }
        />

        {flat.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No pages yet"
            description="Create your first page to start writing notes, specs, or documents."
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
                <Button type="submit" size="sm" className="gap-1.5">
                  <Plus className="size-3.5" />
                  Create page
                </Button>
              </form>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {flat.map((page) => (
              <Link
                key={page.id}
                href={`/w/${workspaceSlug}/pages/${page.id}`}
                className={cn(
                  "group flex flex-col justify-between rounded-lg border border-border/70 bg-card p-4",
                  "transition-all hover:border-border hover:bg-muted/40 hover:shadow-xs"
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded bg-muted/60 text-lg group-hover:scale-105 transition-transform">
                    {page.icon || <FileText className="size-4 text-muted-foreground" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {page.title || "Untitled"}
                    </p>
                    {page.parentTitle ? (
                      <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                        in {page.parentTitle}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                        Root page
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}

            {/* Direct New Page Card */}
            <form
              action={async () => {
                "use server";
                await createPageAction({
                  workspaceId: workspace.id,
                  workspaceSlug,
                });
              }}
            >
              <button
                type="submit"
                className={cn(
                  "w-full h-full min-h-[76px] flex items-center gap-3 rounded-lg border border-dashed border-border/80 bg-muted/20 p-4 text-left",
                  "transition-all hover:border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded border border-border/60 bg-card text-muted-foreground">
                  <Plus className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">New page</p>
                  <p className="text-[11px] text-muted-foreground">Add to workspace</p>
                </div>
              </button>
            </form>
          </div>
        )}
      </div>
    </Screen>
  );
}
