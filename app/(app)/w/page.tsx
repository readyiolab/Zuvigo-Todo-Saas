import { requireUser } from "@/modules/auth/auth.service";
import { getUserWorkspaces } from "@/modules/workspaces/workspace.service";
import { redirect } from "next/navigation";

export default async function WorkspaceIndexPage() {
  const user = await requireUser();
  const workspaces = await getUserWorkspaces(user.id);
  if (workspaces.length === 0) {
    redirect("/w/new");
  }
  redirect(`/w/${workspaces[0].slug}`);
}
