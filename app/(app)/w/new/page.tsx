import Link from "next/link";
import { requireUser } from "@/modules/auth/auth.service";
import { getUserWorkspaces } from "@/modules/workspaces/workspace.service";
import { CreateWorkspaceForm } from "@/components/workspaces/create-workspace-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

export default async function NewWorkspacePage() {
  const user = await requireUser();
  const workspaces = await getUserWorkspaces(user.id);
  const isFirstWorkspace = workspaces.length === 0;

  return (
    <AuthShell
      title={isFirstWorkspace ? "Welcome to Zuvigo" : "Create a workspace"}
      description={
        isFirstWorkspace
          ? "Create your first workspace to organize pages, projects, and tasks."
          : "Workspaces keep your docs, projects, and team in one place."
      }
      footer={
        !isFirstWorkspace ? (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              render={<Link href={`/w/${workspaces[0].slug}`} />}
            >
              Back to {workspaces[0].name}
            </Button>
          </div>
        ) : (
          <p className="text-center text-caption text-muted-foreground">
            You can invite teammates after setup from Settings.
          </p>
        )
      }
    >
      <CreateWorkspaceForm />
    </AuthShell>
  );
}
