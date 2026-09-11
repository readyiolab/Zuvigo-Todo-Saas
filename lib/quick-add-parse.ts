import type { TaskPriority } from "@/modules/tasks/task.types";

export type ParsedQuickAdd = {
  title: string;
  dueAt: string | null;
  priority: TaskPriority | null;
  projectHint: string | null;
  tags: string[];
  estimatedDurationMinutes: number | null;
  raw: string;
};

/**
 * Lightweight natural-language parse for quick task capture.
 * Supports: #tags, !priority, @project, today/tomorrow/weekdays,
 * "at 4pm", "for 30 minutes" / "1h". Does not invent missing fields.
 */
export function parseQuickAdd(input: string): ParsedQuickAdd {
  let remaining = input.trim();
  const tags: string[] = [];
  let priority: TaskPriority | null = null;
  let projectHint: string | null = null;
  let dueAt: string | null = null;
  let estimatedDurationMinutes: number | null = null;

  remaining = remaining.replace(/(?:^|\s)#([\w-]+)/g, (_, tag: string) => {
    tags.push(tag);
    return " ";
  });

  remaining = remaining.replace(
    /(?:^|\s)!(urgent|high|medium|low|p[1-4])\b/gi,
    (_, token: string) => {
      const t = token.toLowerCase();
      if (t === "p1" || t === "urgent") priority = "urgent";
      else if (t === "p2" || t === "high") priority = "high";
      else if (t === "p3" || t === "medium") priority = "medium";
      else if (t === "p4" || t === "low") priority = "low";
      return " ";
    }
  );

  // "high priority" phrase
  remaining = remaining.replace(
    /\b(urgent|high|medium|low)\s+priority\b/gi,
    (_, p: string) => {
      priority = p.toLowerCase() as TaskPriority;
      return " ";
    }
  );

  remaining = remaining.replace(
    /(?:^|\s)@(?:"([^"]+)"|([\w-]+))/g,
    (_, quoted: string, word: string) => {
      projectHint = (quoted || word || "").trim() || null;
      return " ";
    }
  );

  // Duration: for 30 minutes / 30m / 1 hour / 1h / 2 hours
  remaining = remaining.replace(
    /\b(?:for\s+)?(\d+(?:\.\d+)?)\s*(minutes?|mins?|m|hours?|hrs?|h)\b/gi,
    (_, n: string, unit: string) => {
      const num = Number(n);
      if (!Number.isFinite(num) || num <= 0) return " ";
      const u = unit.toLowerCase();
      if (u.startsWith("h")) estimatedDurationMinutes = Math.round(num * 60);
      else estimatedDurationMinutes = Math.round(num);
      return " ";
    }
  );

  const now = new Date();
  const lower = remaining.toLowerCase();
  const time = extractTime(remaining);

  if (/\btoday\b/.test(lower)) {
    dueAt = atTime(now, time ?? { h: 17, m: 0 });
    remaining = remaining.replace(/\btoday\b/gi, " ");
  } else if (/\btomorrow\b/.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    dueAt = atTime(d, time ?? { h: 17, m: 0 });
    remaining = remaining.replace(/\btomorrow\b/gi, " ");
  } else if (/\bnext week\b/.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    dueAt = atTime(d, time ?? { h: 9, m: 0 });
    remaining = remaining.replace(/\bnext week\b/gi, " ");
  } else {
    const weekday = remaining.match(
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
    );
    if (weekday) {
      dueAt = atTime(nextWeekday(now, weekday[1]), time ?? { h: 17, m: 0 });
      remaining = remaining.replace(
        /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
        " "
      );
    }
  }

  remaining = remaining.replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/gi, " ");

  const title = remaining.replace(/\s+/g, " ").trim();

  return {
    title: title || input.trim(),
    dueAt,
    priority,
    projectHint,
    tags,
    estimatedDurationMinutes,
    raw: input,
  };
}

function nextWeekday(from: Date, name: string) {
  const map: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  const target = map[name.toLowerCase()];
  const d = new Date(from);
  const delta = (target - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + delta);
  return d;
}

function extractTime(text: string): { h: number; m: number } | null {
  const m = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const ap = m[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (!ap && h <= 7) h += 12;
  return { h, m: min };
}

function atTime(base: Date, time: { h: number; m: number }) {
  const d = new Date(base);
  d.setHours(time.h, time.m, 0, 0);
  return d.toISOString();
}
