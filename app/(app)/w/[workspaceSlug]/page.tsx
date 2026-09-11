import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ListTodo,
} from "lucide-react";
import { format } from "date-fns";
import { requireUser } from "@/modules/auth/auth.service";
import { getWorkspaceForUserBySlug } from "@/modules/workspaces/workspace.service";
import { listProjects } from "@/modules/projects/project.service";
import { listTasks } from "@/modules/tasks/task.service";
import { roleHasPermission } from "@/modules/workspaces/workspace.permissions";
import {
  explainRecommendation,
  recommendDoNext,
} from "@/modules/productivity/priority.service";
import { getDailyPlan } from "@/modules/productivity/plan.repository";
import { explainRecommendation as aiExplain } from "@/modules/ai/ai.service";
import { Screen } from "@/components/layout/screen";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TodayHub } from "@/components/productivity/today-hub";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatDueDate } from "@/lib/date";
import { cn } from "@/lib/utils";

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function SummaryChip({
  label,
  value,
  href,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  href: string;
  tone: "muted" | "danger" | "info" | "success";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const tones = {
    muted: "border-border/70 bg-card",
    danger: "border-destructive/25 bg-destructive-soft/40",
    info: "border-info/25 bg-info-soft/50",
    success: "border-success/25 bg-success-soft/50",
  };
  return (
    <Link
      href={href}
      className={cn(
        "flex min-w-0 flex-1 items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors hover:bg-muted/30",
        tones[tone]
      )}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-lg font-semibold tabular-nums leading-none">
          {value}
        </p>
        <p className="mt-1 truncate text-caption text-muted-foreground">
          {label}
        </p>
      </div>
    </Link>
  );
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
    todayTasks,
    overdueTasks,
    upcomingTasks,
    completedToday,
    allOpen,
    existingPlan,
  ] = await Promise.all([
    listProjects(workspace.id, user.id),
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
      /* keep heuristic */
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

  const openToday = todayTasks.filter((t) => t.status !== "completed");
  const remaining =
    openToday.length +
    overdueTasks.filter((t) => t.status !== "completed").length;
  const greeting = greetingForHour(new Date().getHours());

  return (
    <Screen>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-title tracking-tight">
            {greeting}, {user.name.split(" ")[0]}
          </h1>
          <p className="text-caption text-muted-foreground">
            {workspace.name} · focus on what matters today
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <SummaryChip
            label="Remaining"
            value={remaining}
            href={`${base}/tasks`}
            tone="muted"
            icon={ListTodo}
          />
          <SummaryChip
            label="Completed"
            value={completedToday.length}
            href={`${base}/tasks?preset=completed`}
            tone="success"
            icon={CheckCircle2}
          />
          <SummaryChip
            label="Overdue"
            value={overdueTasks.length}
            href={`${base}/tasks?preset=overdue`}
            tone="danger"
            icon={AlertCircle}
          />
          <SummaryChip
            label="Upcoming"
            value={upcomingTasks.length}
            href={`${base}/tasks?preset=upcoming`}
            tone="info"
            icon={CalendarClock}
          />
        </div>

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

        <QuickAdd
          workspaceId={workspace.id}
          workspaceSlug={workspaceSlug}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          canCreate={canCreate}
          autoFocus
        />

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Today</h2>
            <Button
              size="xs"
              variant="ghost"
              className="h-7 gap-1 text-muted-foreground"
              render={<Link href={`${base}/tasks?preset=today`} />}
            >
              View all
              <ArrowRight className="size-3" />
            </Button>
          </div>

          {openToday.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Nothing scheduled for today"
              description="You're clear — add a task above or check upcoming work."
              action={
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={`${base}/tasks?preset=upcoming`} />}
                >
                  See upcoming
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/70 bg-card">
              {openToday.slice(0, 8).map((task) => {
                const isNext = initialNext?.taskId === task.id;
                return (
                  <li key={task.id}>
                    <Link
                      href={`${base}/tasks?taskId=${task.id}&preset=today`}
                      className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40"
                    >
                      <span
                        className="size-[18px] shrink-0 rounded-[5px] border border-border-strong"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body font-medium">
                          {task.title}
                          {isNext ? (
                            <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                              Do this next
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-caption text-muted-foreground">
                          {[
                            task.dueAt ? formatDueDate(task.dueAt) : null,
                            task.projectName,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "No due date"}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {overdueTasks.length > 0 ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-destructive">
                Overdue
              </h2>
              <Button
                size="xs"
                variant="ghost"
                className="h-7"
                render={<Link href={`${base}/tasks?preset=overdue`} />}
              >
                Review
              </Button>
            </div>
            <ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-destructive/20 bg-card">
              {overdueTasks.slice(0, 5).map((task) => (
                <li key={task.id}>
                  <Link
                    href={`${base}/tasks?taskId=${task.id}&preset=overdue`}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body font-medium">
                        {task.title}
                      </p>
                      <p className="text-caption text-destructive/80">
                        {task.dueAt ? formatDueDate(task.dueAt) : "Overdue"}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Screen>
  );
}
