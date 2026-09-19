export type MentionType = "person" | "page" | "date";

export type CommentMention = {
  type: MentionType;
  id: string;
  label: string;
};

export type MentionPerson = {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export type MentionPage = {
  id: string;
  title: string;
};

export type DateMentionOption = {
  id: string;
  label: string;
};

function startOfLocalDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isoDateOnly(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function builtInDateMentions(now = new Date()): DateMentionOption[] {
  const today = startOfLocalDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return [
    { id: isoDateOnly(today), label: "Today" },
    { id: isoDateOnly(tomorrow), label: "Tomorrow" },
    { id: isoDateOnly(yesterday), label: "Yesterday" },
  ];
}

export function filterPeople(
  people: MentionPerson[],
  query: string
): MentionPerson[] {
  const q = query.trim().toLowerCase();
  if (!q) return people;
  return people.filter(
    (p) =>
      p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
  );
}

export function filterPages(pages: MentionPage[], query: string): MentionPage[] {
  const q = query.trim().toLowerCase();
  if (!q) return pages;
  return pages.filter((p) => p.title.toLowerCase().includes(q));
}

export function filterDates(
  dates: DateMentionOption[],
  query: string
): DateMentionOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return dates;
  return dates.filter(
    (d) =>
      d.label.toLowerCase().includes(q) || d.id.toLowerCase().includes(q)
  );
}

export type MentionSuggestion =
  | { kind: "person"; person: MentionPerson }
  | { kind: "page"; page: MentionPage }
  | { kind: "date"; date: DateMentionOption };

export function buildMentionSuggestions(input: {
  query: string;
  people: MentionPerson[];
  pages: MentionPage[];
  dates?: DateMentionOption[];
  limit?: number;
}): MentionSuggestion[] {
  const limit = input.limit ?? 12;
  const dates = input.dates ?? builtInDateMentions();
  const people = filterPeople(input.people, input.query).slice(0, limit);
  const pages = filterPages(input.pages, input.query).slice(0, limit);
  const dateHits = filterDates(dates, input.query).slice(0, limit);

  const out: MentionSuggestion[] = [];
  for (const person of people) out.push({ kind: "person", person });
  for (const page of pages) out.push({ kind: "page", page });
  for (const date of dateHits) out.push({ kind: "date", date });
  return out.slice(0, limit);
}

export function suggestionToMention(s: MentionSuggestion): CommentMention {
  if (s.kind === "person") {
    return {
      type: "person",
      id: s.person.userId,
      label: s.person.name,
    };
  }
  if (s.kind === "page") {
    return {
      type: "page",
      id: s.page.id,
      label: s.page.title || "Untitled",
    };
  }
  return { type: "date", id: s.date.id, label: s.date.label };
}

/** Insert `@Label` at caret; returns new body + caret index after insert. */
export function insertMentionToken(
  body: string,
  caret: number,
  label: string,
  replaceFrom?: number
): { body: string; caret: number; token: string } {
  const token = `@${label}`;
  const start = replaceFrom ?? caret;
  const before = body.slice(0, start);
  const after = body.slice(caret);
  const next = `${before}${token} ${after}`;
  return { body: next, caret: before.length + token.length + 1, token };
}

/**
 * Find start of an active `@query` before the caret (no spaces in query).
 * Returns -1 if not in mention mode.
 */
export function mentionQueryRange(
  body: string,
  caret: number
): { start: number; query: string } | null {
  const before = body.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at < 0) return null;
  if (at > 0 && !/\s/.test(before[at - 1] ?? " ")) return null;
  const query = before.slice(at + 1);
  if (/\s/.test(query)) return null;
  return { start: at, query };
}

/** Split comment body into text / mention segments for rendering. */
export function splitMentionSegments(
  body: string,
  mentions: CommentMention[]
): Array<{ type: "text"; value: string } | { type: "mention"; mention: CommentMention }> {
  if (!mentions.length) return [{ type: "text", value: body }];

  const byLabel = [...mentions].sort((a, b) => b.label.length - a.label.length);
  const pattern = byLabel
    .map((m) => `@${m.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`)
    .join("|");
  if (!pattern) return [{ type: "text", value: body }];

  const re = new RegExp(`(${pattern})`, "g");
  const parts = body.split(re);
  const used = new Map<string, number>();

  return parts
    .filter((p) => p.length > 0)
    .map((part) => {
      if (!part.startsWith("@")) return { type: "text" as const, value: part };
      const label = part.slice(1);
      const candidates = byLabel.filter((m) => m.label === label);
      if (candidates.length === 0) return { type: "text" as const, value: part };
      const idx = used.get(label) ?? 0;
      used.set(label, idx + 1);
      const mention = candidates[Math.min(idx, candidates.length - 1)]!;
      return { type: "mention" as const, mention };
    });
}
