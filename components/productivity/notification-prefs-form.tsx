"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveNotificationPrefsAction } from "@/modules/productivity/productivity.actions";
import type { NotificationPrefs } from "@/modules/productivity/plan.repository";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";

const LABELS: { key: keyof NotificationPrefs; label: string; hint: string }[] = [
  {
    key: "upcomingDeadline",
    label: "Upcoming deadlines",
    hint: "Reminders before due dates",
  },
  {
    key: "overdue",
    label: "Overdue tasks",
    hint: "When tasks slip past due",
  },
  {
    key: "assignment",
    label: "Assignments",
    hint: "When someone assigns you a task",
  },
  {
    key: "dailyPlan",
    label: "Daily plan",
    hint: "Nudges about today’s plan",
  },
  {
    key: "recurring",
    label: "Recurring tasks",
    hint: "When the next occurrence is created",
  },
];

export function NotificationPrefsForm({
  workspaceId,
  workspaceSlug,
  initial,
}: {
  workspaceId: string;
  workspaceSlug: string;
  initial: NotificationPrefs;
}) {
  const router = useRouter();
  const [prefs, setPrefs] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle(key: keyof NotificationPrefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    startTransition(async () => {
      const result = await saveNotificationPrefsAction({
        workspaceId,
        workspaceSlug,
        prefs: next,
      });
      if (!result.success) {
        toast.error(result.error.message);
        setPrefs(prefs);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4" aria-busy={pending}>
      {LABELS.map((item) => (
        <div
          key={item.key}
          className="flex items-center justify-between gap-4 rounded-lg border border-border/50 px-3 py-2.5"
        >
          <div className="min-w-0">
            <Label htmlFor={`pref-${item.key}`} className="text-body font-medium">
              {item.label}
            </Label>
            <p className="text-caption text-muted-foreground">{item.hint}</p>
          </div>
          <div className="flex items-center gap-2">
            {pending ? <Spinner className="size-3.5 text-muted-foreground" /> : null}
            <Switch
              id={`pref-${item.key}`}
              checked={prefs[item.key]}
              onCheckedChange={(v) => toggle(item.key, v)}
              disabled={pending}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
