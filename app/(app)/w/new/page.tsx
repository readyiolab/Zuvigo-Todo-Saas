import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/modules/auth/auth.service";
import { getUserWorkspaces } from "@/modules/workspaces/workspace.service";
import { CreateWorkspaceForm } from "@/components/workspaces/create-workspace-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default async function NewWorkspacePage() {
  const user = await requireUser();
  const workspaces = await getUserWorkspaces(user.id);
  const isFirstWorkspace = workspaces.length === 0;
  const previousWorkspace = workspaces[0] ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Header Bar */}
      <header className="flex h-14 w-full items-center justify-between border-b border-border px-6 sm:px-10 bg-background">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-base tracking-tight hover:opacity-80 transition-opacity"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            Z
          </span>
          <span>Zuvigo</span>
        </Link>

        <div className="flex items-center gap-2">
          {previousWorkspace ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              render={<Link href={`/w/${previousWorkspace.slug}`} />}
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to {previousWorkspace.name}</span>
            </Button>
          ) : null}
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-2xl space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {isFirstWorkspace ? "Welcome! Create your workspace" : "Create a new workspace"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Workspaces keep your documents, projects, assignments, and tasks organized in one place.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xs">
            <CreateWorkspaceForm
              defaultBackUrl={previousWorkspace ? `/w/${previousWorkspace.slug}` : undefined}
              defaultBackName={previousWorkspace?.name}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
