import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/modules/auth/auth.service";

export default async function MarketingPage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/w");
  }

  return (
    <div className="min-h-full">
      <header className="mx-auto flex w-full max-w-wide items-center justify-between px-gutter py-5">
        <span className="text-body font-semibold tracking-tight">Zuvigo</span>
        <div className="flex items-center gap-2">
          {user ? (
            <Button render={<Link href="/w" />}>Open workspace</Button>
          ) : (
            <>
              <Button variant="ghost" render={<Link href="/login" />}>
                Sign in
              </Button>
              <Button render={<Link href="/signup" />}>Get started</Button>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-wide flex-col gap-12 px-gutter pb-24 pt-16 md:pt-24">
        <div className="max-w-content space-y-4">
          <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
            Workspace platform
          </p>
          <h1 className="text-title text-balance">
            Docs, projects, and knowledge — in one calm workspace.
          </h1>
          <p className="max-w-form text-body text-muted-foreground md:max-w-content">
            Zuvigo is a professional SaaS workspace for teams that need
            documentation, project management, and structured data without the
            noise.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button render={<Link href={user ? "/w" : "/signup"} />}>
              {user ? "Go to workspace" : "Start free"}
            </Button>
            {!user ? (
              <Button variant="outline" render={<Link href="/login" />}>
                Sign in
              </Button>
            ) : null}
          </div>
        </div>

        <section className="grid gap-8 border-t pt-10 md:grid-cols-3">
          {[
            {
              title: "Pages & knowledge",
              body: "Nested docs with a block model built for drag-and-drop editing.",
            },
            {
              title: "Projects & tasks",
              body: "List and board workflows with assignees, due dates, and priorities.",
            },
            {
              title: "Secure by design",
              body: "Workspace tenancy, role-based access, and real MySQL persistence.",
            },
          ].map((item) => (
            <div key={item.title} className="space-y-2">
              <h2 className="text-body font-medium">{item.title}</h2>
              <p className="text-caption text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
