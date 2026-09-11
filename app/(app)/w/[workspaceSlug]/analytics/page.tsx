import Link from "next/link";
import { requireUser } from "@/modules/auth/auth.service";
import { getWorkspaceForUserBySlug } from "@/modules/workspaces/workspace.service";
import { listTasks } from "@/modules/tasks/task.service";
import { computeProductivityAnalytics } from "@/modules/productivity/analytics.service";
import { formatDurationMinutes } from "@/modules/productivity/priority.service";
import { Screen, ScreenHeader } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card px-4 py-3">
      <p className="text-caption text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-caption text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const user = await requireUser();
  const { workspace } = await getWorkspaceForUserBySlug(workspaceSlug, user.id);
  const tasks = await listTasks(workspace.id, user.id);
  const stats = computeProductivityAnalytics(tasks);
  const base = `/w/${workspaceSlug}`;

  return (
    <Screen>
      <ScreenHeader
        title="Analytics"
        description="Completion, focus time, and estimate accuracy"
        action={
          <Button
            size="sm"
            variant="outline"
            render={<Link href={base} />}
          >
            Back to Today
          </Button>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Open" value={String(stats.openCount)} />
        <Stat label="Completed" value={String(stats.completedCount)} />
        <Stat label="Overdue" value={String(stats.overdueCount)} />
        <Stat
          label="Completion rate"
          value={
            stats.completionRate == null
              ? "—"
              : `${Math.round(stats.completionRate * 100)}%`
          }
        />
        <Stat
          label="This week"
          value={String(stats.weekCompleted)}
          hint="Tasks completed"
        />
        <Stat
          label="This month"
          value={String(stats.monthCompleted)}
          hint="Tasks completed"
        />
        <Stat
          label="Time spent"
          value={formatDurationMinutes(stats.timeSpentMinutes) ?? "0 min"}
          hint="From focus sessions"
        />
        <Stat
          label="Estimated"
          value={formatDurationMinutes(stats.estimatedMinutes) ?? "0 min"}
          hint="Sum of estimates"
        />
        <Stat
          label="Estimate skew"
          value={
            stats.estimateSkewRatio == null
              ? "—"
              : `${stats.estimateSkewRatio.toFixed(2)}×`
          }
          hint="Actual ÷ estimate (needs 3+ samples)"
        />
      </div>

      {stats.insight ? (
        <p
          className="mt-6 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-body text-muted-foreground"
          role="status"
        >
          {stats.insight}
        </p>
      ) : (
        <p className="mt-6 text-caption text-muted-foreground">
          Complete a few focused sessions to unlock estimate insights.
        </p>
      )}
    </Screen>
  );
}
