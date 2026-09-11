import { getAiProvider } from "@/infrastructure/ai/provider";
import type { TaskPriority } from "@/modules/tasks/task.types";
import { parseQuickAdd } from "@/lib/quick-add-parse";
import { logger } from "@/shared/logger";

export async function askWorkspaceAssistant(input: {
  workspaceId: string;
  userId: string;
  prompt: string;
}) {
  const provider = getAiProvider();
  const answer = await provider.chat([
    {
      role: "system",
      content: "You are a helpful workspace productivity assistant.",
    },
    { role: "user", content: input.prompt },
  ]);
  return { answer, configured: provider.isConfigured() };
}

/** Prefer local NL parse; optionally enhance with AI when configured. */
export async function parseTask(input: string) {
  const local = parseQuickAdd(input);
  const provider = getAiProvider();
  if (!provider.isConfigured() || input.trim().length < 8) {
    return { ...local, source: "local" as const };
  }

  try {
    const raw = await provider.chat([
      {
        role: "system",
        content:
          'Extract a task as JSON: {"title":string,"dueAt":ISO|null,"priority":"low"|"medium"|"high"|"urgent"|null,"estimatedDurationMinutes":number|null,"projectHint":string|null}. Do not invent fields you cannot infer. Reply JSON only.',
      },
      { role: "user", content: input },
    ]);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { ...local, source: "local" as const };
    const parsed = JSON.parse(match[0]) as {
      title?: string;
      dueAt?: string | null;
      priority?: TaskPriority | null;
      estimatedDurationMinutes?: number | null;
      projectHint?: string | null;
    };
    return {
      title: parsed.title?.trim() || local.title,
      dueAt: parsed.dueAt || local.dueAt,
      priority: parsed.priority || local.priority,
      projectHint: parsed.projectHint || local.projectHint,
      tags: local.tags,
      estimatedDurationMinutes:
        parsed.estimatedDurationMinutes ?? local.estimatedDurationMinutes,
      raw: input,
      source: "ai" as const,
    };
  } catch (error) {
    logger.warn("ai_parse_task_fallback", { error: String(error) });
    return { ...local, source: "local" as const };
  }
}

export type BreakdownSuggestion = { title: string };

/** Heuristic fallback when AI is unavailable. */
function heuristicBreakdown(title: string): BreakdownSuggestion[] {
  const base = title.replace(/\.$/, "").trim() || "this task";
  return [
    { title: `Clarify scope for ${base}` },
    { title: `Gather requirements for ${base}` },
    { title: `Draft first version of ${base}` },
    { title: `Review and polish ${base}` },
    { title: `Ship / complete ${base}` },
  ];
}

export async function breakDownTask(input: {
  title: string;
  description?: string | null;
}): Promise<{ suggestions: BreakdownSuggestion[]; source: "ai" | "heuristic" }> {
  const provider = getAiProvider();
  if (!provider.isConfigured()) {
    return { suggestions: heuristicBreakdown(input.title), source: "heuristic" };
  }

  try {
    const raw = await provider.chat([
      {
        role: "system",
        content:
          'Break the task into 4-8 concrete subtasks. Reply JSON only: {"subtasks":[{"title":"..."}]}',
      },
      {
        role: "user",
        content: `Task: ${input.title}\n${input.description ?? ""}`,
      },
    ]);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return { suggestions: heuristicBreakdown(input.title), source: "heuristic" };
    }
    const parsed = JSON.parse(match[0]) as {
      subtasks?: Array<{ title?: string }>;
    };
    const suggestions = (parsed.subtasks ?? [])
      .map((s) => ({ title: (s.title ?? "").trim() }))
      .filter((s) => s.title.length > 0)
      .slice(0, 10);
    if (suggestions.length === 0) {
      return { suggestions: heuristicBreakdown(input.title), source: "heuristic" };
    }
    return { suggestions, source: "ai" };
  } catch (error) {
    logger.warn("ai_breakdown_fallback", { error: String(error) });
    return { suggestions: heuristicBreakdown(input.title), source: "heuristic" };
  }
}

export async function explainRecommendation(input: {
  title: string;
  reasons: string[];
}): Promise<string> {
  const fallback =
    input.reasons.length > 0
      ? `High priority because ${input.reasons.map((r) => r.toLowerCase()).join(", ")}.`
      : "This looks like a strong next step.";

  const provider = getAiProvider();
  if (!provider.isConfigured()) return fallback;

  try {
    const raw = await provider.chat([
      {
        role: "system",
        content:
          "Write one short friendly sentence explaining why the user should do this task next. No markdown.",
      },
      {
        role: "user",
        content: `Task: ${input.title}\nReasons: ${input.reasons.join("; ")}`,
      },
    ]);
    return raw.trim() || fallback;
  } catch {
    return fallback;
  }
}

export async function generateDailyPlanHint(input: {
  slots: Array<{ title: string; start: string }>;
}): Promise<string | null> {
  const provider = getAiProvider();
  if (!provider.isConfigured() || input.slots.length === 0) return null;
  try {
    return (
      (
        await provider.chat([
          {
            role: "system",
            content: "One encouraging sentence about today's plan. No markdown.",
          },
          {
            role: "user",
            content: input.slots
              .map((s) => `${s.start}: ${s.title}`)
              .join("\n"),
          },
        ])
      ).trim() || null
    );
  } catch {
    return null;
  }
}
