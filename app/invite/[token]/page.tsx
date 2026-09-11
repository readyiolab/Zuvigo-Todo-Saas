import { requireUser } from "@/modules/auth/auth.service";
import { AcceptInviteForm } from "@/components/workspaces/accept-invite-form";
import { AuthShell } from "@/components/auth/auth-shell";
import Link from "next/link";

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await requireUser();
  const { token } = await params;

  return (
    <AuthShell
      title="Join workspace"
      description="You’ve been invited to collaborate on a Zuvigo workspace."
      footer={
        <p className="text-center text-caption text-muted-foreground">
          Wrong account?{" "}
          <Link
            href="/login"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Sign in with another email
          </Link>
        </p>
      }
    >
      <AcceptInviteForm token={token} />
    </AuthShell>
  );
}
