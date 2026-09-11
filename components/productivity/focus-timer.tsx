"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Pause, Play, X } from "lucide-react";
import { toast } from "sonner";
import {
  completeFocusAction,
  pauseFocusAction,
  startFocusAction,
} from "@/modules/productivity/productivity.actions";
import { formatDurationMinutes } from "@/modules/productivity/priority.service";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FocusTimer({
  workspaceId,
  workspaceSlug,
  taskId,
  title,
  description,
  estimatedDurationMinutes,
  focusStartedAt,
  actualDurationMinutes,
}: {
  workspaceId: string;
  workspaceSlug: string;
  taskId: string;
  title: string;
  description: string | null;
  estimatedDurationMinutes: number | null;
  focusStartedAt: string | null;
  actualDurationMinutes: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pomodoro, setPomodoro] = useState(false);
  const [tick, setTick] = useState(0);
  const active = Boolean(focusStartedAt);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  const startedMs = focusStartedAt ? new Date(focusStartedAt).getTime() : 0;
  void tick;
  const elapsedSeconds = active
    ? Math.max(0, Math.floor((Date.now() - startedMs) / 1000))
    : 0;

  const pomodoroTarget = 25 * 60;
  const displaySeconds = pomodoro
    ? Math.max(0, pomodoroTarget - elapsedSeconds)
    : elapsedSeconds;

  function start() {
    startTransition(async () => {
      const result = await startFocusAction({
        workspaceId,
        workspaceSlug,
        taskId,
      });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  function pause() {
    startTransition(async () => {
      const result = await pauseFocusAction({
        workspaceId,
        workspaceSlug,
        taskId,
      });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Focus paused");
      router.refresh();
    });
  }

  function complete(markDone: boolean) {
    startTransition(async () => {
      const result = await completeFocusAction({
        workspaceId,
        workspaceSlug,
        taskId,
        markDone,
      });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success(markDone ? "Task completed" : "Focus session saved");
      router.push(`/w/${workspaceSlug}/tasks?taskId=${taskId}`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-8 px-4 py-10">
      <div className="flex items-center justify-between">
        <Button
          size="sm"
          variant="ghost"
          render={<Link href={`/w/${workspaceSlug}/tasks?taskId=${taskId}`} />}
        >
          <X className="size-4" />
          Exit
        </Button>
        <label className="flex items-center gap-2 text-caption text-muted-foreground">
          <input
            type="checkbox"
            checked={pomodoro}
            onChange={(e) => setPomodoro(e.target.checked)}
            className="size-3.5 accent-foreground"
          />
          Pomodoro 25m
        </label>
      </div>

      <div className="space-y-3 text-center">
        <h1 className="text-title tracking-tight">{title}</h1>
        {description ? (
          <p className="text-body text-muted-foreground line-clamp-3">
            {description}
          </p>
        ) : null}
        <p className="text-caption text-muted-foreground">
          {[
            formatDurationMinutes(estimatedDurationMinutes)
              ? `Est. ${formatDurationMinutes(estimatedDurationMinutes)}`
              : null,
            actualDurationMinutes
              ? `Logged ${formatDurationMinutes(actualDurationMinutes)}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Focus on this task"}
        </p>
      </div>

      <div
        className={cn(
          "mx-auto flex size-44 items-center justify-center rounded-full border border-border/70 bg-card tabular-nums",
          "text-3xl font-semibold tracking-tight"
        )}
        aria-live="polite"
        aria-atomic
      >
        {formatElapsed(displaySeconds)}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {!active ? (
          <Button size="lg" disabled={pending} onClick={start}>
            {pending ? <Spinner /> : <Play className="size-4" />}
            Start focus
          </Button>
        ) : (
          <Button size="lg" variant="outline" disabled={pending} onClick={pause}>
            {pending ? <Spinner /> : <Pause className="size-4" />}
            Pause
          </Button>
        )}
        <Button
          size="lg"
          variant="secondary"
          disabled={pending}
          onClick={() => complete(true)}
        >
          <Check className="size-4" />
          Complete
        </Button>
        {active ? (
          <Button
            size="lg"
            variant="ghost"
            disabled={pending}
            onClick={() => complete(false)}
          >
            Save time only
          </Button>
        ) : null}
      </div>
    </div>
  );
}
