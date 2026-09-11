import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/auth-forms";
import { AuthShell } from "@/components/auth/auth-shell";
import Link from "next/link";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Create account"
      description="Start a secure workspace for your team"
      footer={
        <p className="text-center text-caption text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
