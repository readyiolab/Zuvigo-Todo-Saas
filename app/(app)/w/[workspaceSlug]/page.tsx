import Link from "next/link";
import {
  CalendarDays,
  CheckSquare,
  Database,
  FolderKanban,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { requireUser } from "@/modules/auth/auth.service";
import { getWorkspaceForUserBySlug } from "@/modules/workspaces/workspace.service";
import { listProjects } from "@/modules/projects/project.service";
import { listTasks } from "@/modules/tasks/task.service";
import { listDatabases } from "@/modules/databases/database.service";
import { getRecentPages } from "@/modules/pages/page.service";
import { roleHasPermission } from "@/modules/workspaces/workspace.permissions";
import {
  explainRecommendation,
  recommendDoNext,
} from "@/modules/productivity/priority.service";
import { getDailyPlan } from "@/modules/productivity/plan.repository";
import { explainRecommendation as aiExplain } from "@/modules/ai/ai.service";
import { Screen } from "@/components/layout/screen";
import { RecentPagesGrid } from "@/components/pages/recent-pages-grid";
import { HomeTaskList } from "@/components/tasks/home-task-list";
import { TodayHub } from "@/components/productivity/today-hub";
import { cn } from "@/lib/utils";

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function WorkspaceHomePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const user = await requireUser();
  const { workspace, membership } = await getWorkspaceForUserBySlug(
    workspaceSlug,
    user.id
  );

  const canCreate = roleHasPermission(membership.role, "tasks.create");
  const base = `/w/${workspaceSlug}`;

  const [
    projects,
    recentPages,
    databases,
    todayTasks,
    overdueTasks,
    upcomingTasks,
    completedToday,
    allOpen,
    existingPlan,
  ] = await Promise.all([
    listProjects(workspace.id, user.id),
    getRecentPages(workspace.id, user.id, 6),
    listDatabases(workspace.id, user.id),
    listTasks(workspace.id, user.id, { due: "today" }),
    listTasks(workspace.id, user.id, { due: "overdue" }),
    listTasks(workspace.id, user.id, { due: "upcoming" }),
    listTasks(workspace.id, user.id, { due: "completed" }),
    listTasks(workspace.id, user.id, { parentTaskId: null }),
    getDailyPlan({
      workspaceId: workspace.id,
      userId: user.id,
      planDate: format(new Date(), "yyyy-MM-dd"),
    }),
  ]);

  const openTasks = allOpen.filter(
    (t) => t.status !== "completed" && t.status !== "cancelled"
  );
  const nextScored = recommendDoNext(openTasks);
  let explanation = nextScored ? explainRecommendation(nextScored) : "";
  if (nextScored) {
    try {
      explanation = await aiExplain({
        title: nextScored.task.title,
        reasons: nextScored.reasons,
      });
    } catch {
      /* fallback */
    }
  }

  const initialNext = nextScored
    ? {
        taskId: nextScored.task.id,
        title: nextScored.task.title,
        reasons: nextScored.reasons,
        explanation,
        estimatedDurationMinutes: nextScored.task.estimatedDurationMinutes,
        dueAt: nextScored.task.dueAt
          ? new Date(nextScored.task.dueAt).toISOString()
          : null,
      }
    : null;

  const hour = new Date().getHours();
  const greeting = greetingForHour(hour);
  const firstName = user.name.split(" ")[0] || "there";
  const formattedDate = format(new Date(), "EEEE, MMMM d");

  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));

  return (
    <Screen>
      <div className="mx-auto max-w-5xl space-y-8 pb-10">
        {/* Notion-style Friendly Greeting Header */}
        <div className="space-y-1 pt-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-xs text-muted-foreground">
            {formattedDate} · {workspace.name}
          </p>
        </div>

        {/* Recently Visited Pages */}
        <RecentPagesGrid
          workspaceId={workspace.id}
          workspaceSlug={workspaceSlug}
          pages={recentPages}
        />

        {/* Quick Tools & Spaces Grid */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
            Workspaces & Views
          </h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Link
              href={`${base}/tasks`}
              className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-card p-3 transition-all hover:border-border hover:bg-muted/40 hover:shadow-xs"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                <CheckSquare className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">Tasks</p>
                <p className="text-[10px] text-muted-foreground">
                  {openTasks.length} open
                </p>
              </div>
            </Link>

            <Link
              href={`${base}/projects`}
              className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-card p-3 transition-all hover:border-border hover:bg-muted/40 hover:shadow-xs"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                <FolderKanban className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">Projects</p>
                <p className="text-[10px] text-muted-foreground">
                  {projects.length} total
                </p>
              </div>
            </Link>

            <Link
              href={`${base}/databases`}
              className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-card p-3 transition-all hover:border-border hover:bg-muted/40 hover:shadow-xs"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                <Database className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">Databases</p>
                <p className="text-[10px] text-muted-foreground">
                  {databases.length} active
                </p>
              </div>
            </Link>

            <Link
              href={`${base}/calendar`}
              className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-card p-3 transition-all hover:border-border hover:bg-muted/40 hover:shadow-xs"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                <CalendarDays className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">Calendar</p>
                <p className="text-[10px] text-muted-foreground">Schedule</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Tasks Section with Notion Tabs and Inline Checkbox */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
            My Tasks
          </h2>
          <HomeTaskList
            workspaceId={workspace.id}
            workspaceSlug={workspaceSlug}
            todayTasks={todayTasks}
            overdueTasks={overdueTasks}
            upcomingTasks={upcomingTasks}
            completedTasks={completedToday}
            projects={projectOptions}
            canCreate={canCreate}
          />
        </div>

        {/* AI Assistant / Today Hub */}
        {initialNext ? (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
              <Sparkles className="size-3 text-primary" />
              <span>Smart Prioritization</span>
            </h2>
            <TodayHub
              workspaceId={workspace.id}
              workspaceSlug={workspaceSlug}
              initialNext={initialNext}
              initialPlan={
                existingPlan
                  ? { planDate: existingPlan.planDate, slots: existingPlan.slots }
                  : null
              }
            />
          </div>
        ) : null}
      </div>
    </Screen>
  );
}
