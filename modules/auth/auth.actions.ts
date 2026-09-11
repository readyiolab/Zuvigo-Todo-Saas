"use server";

import { redirect } from "next/navigation";
import { login, logout, requireUser, signup } from "@/modules/auth/auth.service";
import {
  type ActionResult,
  failAction,
  isRedirectError,
} from "@/shared/actions/result";
import { createWorkspace, getUserWorkspaces } from "@/modules/workspaces/workspace.service";

export type { ActionResult };

export async function signupAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const name = String(formData.get("name") ?? "");
    await signup({
      name,
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });

    const user = await requireUser();
    const ws = await createWorkspace(user.id, {
      name: `${name.split(" ")[0] || "My"}'s Workspace`,
    });
    redirect(`/w/${ws.slug}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return failAction(error, "auth_signup_error");
  }
}

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const result = await login({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });

    const workspaces = await getUserWorkspaces(result.user.id);
    const allowedSlugs = new Set(workspaces.map((w) => w.slug));

    const next = String(formData.get("next") ?? "").trim();
    if (next.startsWith("/") && !next.startsWith("//")) {
      const workspaceMatch = next.match(/^\/w\/([^/]+)/);
      const nextSlug = workspaceMatch?.[1];
      // Only honor deep-links into workspaces the user can access
      if (!nextSlug || allowedSlugs.has(nextSlug)) {
        redirect(next);
      }
    }

    if (workspaces.length === 0) {
      redirect("/w/new");
    }
    const preferred =
      workspaces.find((w) => w.slug === "acme-demo") ?? workspaces[0];
    redirect(`/w/${preferred.slug}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return failAction(error, "auth_login_error");
  }
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}
