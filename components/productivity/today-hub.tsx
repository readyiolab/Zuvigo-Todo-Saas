"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Play, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  generateDailyPlanAction,
  getNextTaskAction,
} from "@/modules/productivity/productivity.actions";
import type { PlanSlot } from "@/modules/productivity/planner.service";
import { formatSlotTime } from "@/modules/productivity/planner.service";
import { formatDurationMinutes } from "@/modules/productivity/priority.service";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type NextTask = {
  taskId: string;
  title: string;
  reasons: string[];
  explanation: string;
  estimatedDurationMinutes: number | null;
  dueAt: string | null;
};

export function TodayHub({
  workspaceId,
  workspaceSlug,
  initialNext,
  initialPlan,
}: {
  workspaceId: string;
  workspaceSlug: string;
  initialNext: NextTask | null;
  initialPlan: { planDate: string; slots: PlanSlot[] } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [next, setNext] = useState(initialNext);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [plan, setPlan] = useState(initialPlan);
  const base = `/w/${workspaceSlug}`;

  function refreshNext(excludeCurrent = false) {
    const excludeIds = excludeCurrent && next ? [...excluded, next.taskId] : excluded;
    if (excludeCurrent && next) setExcluded(excludeIds);
    startTransition(async () => {
      const result = await getNextTaskAction({ workspaceId, excludeIds });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      setNext((result.data as NextTask | null) ?? null);
      router.refresh();
    });
  }

  function generatePlan() {
    startTransition(async () => {
      const result = await generateDailyPlanAction({
        workspaceId,
        workspaceSlug,
      });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      setPlan(result.data as { planDate: string; slots: PlanSlot[] });
      toast.success("Today’s plan ready");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section
        className="rounded-xl border border-border/70 bg-card p-4 sm:p-5"
        aria-labelledby="what-next-heading"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-caption font-medium text-muted-foreground">
              Recommended
            </p>
            <h2 id="what-next-heading" className="text-sm font-semibold">
              What should I do next?
            </h2>
          </div>
          <Sparkles className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </div>

        {next ? (
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-[15px] font-medium leading-snug">{next.title}</p>
              <p className="mt-1 text-caption text-muted-foreground">
                {next.explanation}
              </p>
              {formatDurationMinutes(next.estimatedDurationMinutes) ? (
                <p className="mt-1 text-caption text-muted-foreground">
                  ~{formatDurationMinutes(next.estimatedDurationMinutes)}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                render={
                  <Link href={`${base}/focus/${next.taskId}`} />
                }
              >
                <Play className="size-3.5" />
                Start focus
              </Button>
              <Button
                size="sm"
                variant="outline"
                render={
                  <Link
                    href={`${base}/tasks?taskId=${next.taskId}`}
                  />
                }
              >
                Open task
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => refreshNext(true)}
              >
                Choose another
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-caption text-muted-foreground">
            You’re clear — no open tasks to recommend.
          </p>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="plan-heading">
        <div className="flex items-center justify-between gap-2">
          <h2 id="plan-heading" className="text-sm font-semibold">
            Today’s plan
          </h2>
          <Button
            size="xs"
            variant="ghost"
            className="h-7 gap-1 text-muted-foreground"
            disabled={pending}
            onClick={generatePlan}
          >
            {pending ? (
              <Spinner className="size-3" />
            ) : (
              <RefreshCw className="size-3" />
            )}
            {plan?.slots?.length ? "Reschedule" : "Build plan"}
          </Button>
        </div>

        {!plan?.slots?.length ? (
          <p className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-caption text-muted-foreground">
            Build a day plan from your highest-priority open tasks (9:00–17:00).
          </p>
        ) : (
          <ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/70 bg-card">
            {plan.slots.map((slot) => (
              <li key={`${slot.taskId}-${slot.start}`}>
                <Link
                  href={`${base}/focus/${slot.taskId}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40"
                  )}
                >
                  <span className="w-12 shrink-0 text-caption tabular-nums text-muted-foreground">
                    {formatSlotTime(slot.start)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-medium">{slot.title}</p>
                    <p className="text-caption text-muted-foreground">
                      {slot.estimatedMinutes} min
                    </p>
                  </div>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
