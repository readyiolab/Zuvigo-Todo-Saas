import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/auth-forms";
import { AuthShell } from "@/components/auth/auth-shell";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthShell
      title="Sign in"
      description="Access your Zuvigo workspaces"
      footer={
        <p className="text-center text-caption text-muted-foreground">
          No account?{" "}
          <Link
            href="/signup"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      }
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
