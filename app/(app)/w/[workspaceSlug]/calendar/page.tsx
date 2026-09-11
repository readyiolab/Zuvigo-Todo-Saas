import Link from "next/link";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarDays } from "lucide-react";
import { requireUser } from "@/modules/auth/auth.service";
import { getWorkspaceForUserBySlug } from "@/modules/workspaces/workspace.service";
import { listTasks } from "@/modules/tasks/task.service";
import { Screen } from "@/components/layout/screen";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { workspaceSlug } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const { workspace } = await getWorkspaceForUserBySlug(
    workspaceSlug,
    user.id
  );

  const anchor = sp.month ? new Date(`${sp.month}-01T12:00:00`) : new Date();
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const tasks = await listTasks(workspace.id, user.id, {});
  const dated = tasks.filter((t) => t.dueAt && t.status !== "cancelled");

  const byDay = new Map<string, typeof dated>();
  for (const task of dated) {
    const key = format(new Date(task.dueAt!), "yyyy-MM-dd");
    const list = byDay.get(key) ?? [];
    list.push(task);
    byDay.set(key, list);
  }

  const prev = format(addDays(monthStart, -1), "yyyy-MM");
  const next = format(addDays(monthEnd, 1), "yyyy-MM");
  const base = `/w/${workspaceSlug}/calendar`;

  return (
    <Screen density="wide">
      <PageHeader
        title="Calendar"
        description="Tasks by due date — click a task to open details"
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              render={<Link href={`${base}?month=${prev}`} />}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              render={<Link href={base} />}
            >
              Today
            </Button>
            <Button
              size="sm"
              variant="outline"
              render={<Link href={`${base}?month=${next}`} />}
            >
              Next
            </Button>
          </div>
        }
      />

      <div className="mb-3 text-sm font-semibold">
        {format(monthStart, "MMMM yyyy")}
      </div>

      {dated.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No dated tasks yet"
          description="Add due dates to tasks and they will appear on this calendar."
          action={
            <Button
              size="sm"
              render={<Link href={`/w/${workspaceSlug}/tasks?new=1`} />}
            >
              Create task
            </Button>
          }
        />
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
        <div className="grid grid-cols-7 border-b border-border/60 bg-muted/30">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-[11px] font-medium text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayTasks = byDay.get(key) ?? [];
            const inMonth = isSameMonth(day, monthStart);
            return (
              <div
                key={key}
                className={cn(
                  "min-h-24 border-r border-b border-border/40 p-1.5 last:border-r-0",
                  !inMonth && "bg-muted/20"
                )}
              >
                <div
                  className={cn(
                    "mb-1 flex size-6 items-center justify-center rounded-full text-[11px] font-medium",
                    isToday(day) && "bg-primary text-primary-foreground",
                    !isToday(day) && inMonth && "text-foreground",
                    !inMonth && "text-muted-foreground/60"
                  )}
                >
                  {format(day, "d")}
                </div>
                <ul className="space-y-0.5">
                  {dayTasks.slice(0, 3).map((task) => (
                    <li key={task.id}>
                      <Link
                        href={`/w/${workspaceSlug}/tasks?taskId=${task.id}`}
                        className={cn(
                          "block truncate rounded px-1 py-0.5 text-[10px] font-medium",
                          "bg-primary-soft text-primary hover:bg-primary/15",
                          task.status === "completed" &&
                            "bg-muted text-muted-foreground line-through"
                        )}
                        title={task.title}
                      >
                        {task.title}
                      </Link>
                    </li>
                  ))}
                  {dayTasks.length > 3 ? (
                    <li className="px-1 text-[10px] text-muted-foreground">
                      +{dayTasks.length - 3} more
                    </li>
                  ) : null}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </Screen>
  );
}
