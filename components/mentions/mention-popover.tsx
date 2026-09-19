"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, FileText } from "lucide-react";
import { searchWorkspaceAction } from "@/modules/search/search.actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  buildMentionSuggestions,
  builtInDateMentions,
  suggestionToMention,
  type CommentMention,
  type MentionPerson,
  type MentionSuggestion,
} from "@/lib/mention-helpers";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-primary/15 text-foreground">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function MentionSuggestionList({
  open,
  onClose,
  query,
  people,
  workspaceId,
  onSelect,
  className,
}: {
  open: boolean;
  onClose: () => void;
  query: string;
  people: MentionPerson[];
  workspaceId: string;
  onSelect: (mention: CommentMention) => void;
  className?: string;
}) {
  const [active, setActive] = useState(0);
  const [searchedPages, setSearchedPages] = useState<
    { id: string; title: string }[]
  >([]);
  const [searchKey, setSearchKey] = useState("");
  const dates = useMemo(() => builtInDateMentions(), []);
  const trimmed = query.trim();
  const pages = useMemo(
    () => (trimmed ? (searchKey === trimmed ? searchedPages : []) : []),
    [trimmed, searchKey, searchedPages]
  );

  useEffect(() => {
    if (!open || !trimmed) return;
    let cancelled = false;
    const key = trimmed;
    const timer = window.setTimeout(async () => {
      const result = await searchWorkspaceAction({
        workspaceId,
        query: key,
      });
      if (cancelled) return;
      if (!result.success || !result.data) {
        setSearchedPages([]);
        setSearchKey(key);
        return;
      }
      const results = (
        result.data as {
          results: Array<{ id: string; title: string }>;
        }
      ).results;
      setSearchedPages(
        results.map((r) => ({ id: r.id, title: r.title || "Untitled" }))
      );
      setSearchKey(key);
      setActive(0);
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, trimmed, workspaceId]);

  const suggestions = useMemo(
    () =>
      buildMentionSuggestions({
        query,
        people,
        pages,
        dates,
        limit: 10,
      }),
    [query, people, pages, dates]
  );

  const activeIndex =
    suggestions.length === 0
      ? 0
      : Math.min(active, suggestions.length - 1);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (suggestions.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setActive((i) => (i + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setActive(
          (i) => (i - 1 + suggestions.length) % suggestions.length
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        const item = suggestions[activeIndex];
        if (item) onSelect(suggestionToMention(item));
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, suggestions, activeIndex, onClose, onSelect]);

  if (!open) return null;

  return (
    <div
      role="listbox"
      aria-label="Mention suggestions"
      className={cn(
        "absolute bottom-full left-0 z-50 mb-1 max-h-64 w-80 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-overlay",
        className
      )}
    >
      {suggestions.length === 0 ? (
        <p className="px-3 py-4 text-center text-caption text-muted-foreground">
          No matches
        </p>
      ) : (
        suggestions.map((item, index) => (
          <MentionRow
            key={`${item.kind}-${
              item.kind === "person"
                ? item.person.userId
                : item.kind === "page"
                  ? item.page.id
                  : item.date.id
            }`}
            item={item}
            query={query}
            active={index === activeIndex}
            onSelect={() => onSelect(suggestionToMention(item))}
            onHover={() => setActive(index)}
          />
        ))
      )}
    </div>
  );
}

function MentionRow({
  item,
  query,
  active,
  onSelect,
  onHover,
}: {
  item: MentionSuggestion;
  query: string;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left",
        active ? "bg-accent" : "hover:bg-muted/60"
      )}
      onMouseEnter={onHover}
      onClick={onSelect}
    >
      {item.kind === "person" ? (
        <>
          <Avatar size="sm" className="size-7 shrink-0">
            <AvatarFallback className="text-[10px]">
              {initials(item.person.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-body font-medium">
              {highlight(item.person.name, query)}
            </p>
            <p className="truncate text-caption text-muted-foreground">
              {item.person.email}
            </p>
          </div>
        </>
      ) : null}
      {item.kind === "page" ? (
        <>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
            <FileText className="size-3.5 text-muted-foreground" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-body font-medium">
              {highlight(item.page.title || "Untitled", query)}
            </p>
            <p className="text-caption text-muted-foreground">Page</p>
          </div>
        </>
      ) : null}
      {item.kind === "date" ? (
        <>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
            <Calendar className="size-3.5 text-muted-foreground" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-body font-medium">
              {highlight(item.date.label, query)}
            </p>
            <p className="text-caption text-muted-foreground">{item.date.id}</p>
          </div>
        </>
      ) : null}
    </button>
  );
}
