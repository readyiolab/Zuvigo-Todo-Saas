"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  CalendarDays,
  CheckSquare,
  FileText,
  FolderKanban,
  Inbox,
  LogOut,
  Moon,
  Plus,
  Settings,
  Sun,
} from "lucide-react";
import { logoutAction } from "@/modules/auth/auth.actions";
import { createPageAction } from "@/modules/pages/page.actions";
import { searchWorkspaceAction } from "@/modules/search/search.actions";
import type { PageTreeNode } from "@/modules/pages/page.types";
import type { SearchResult } from "@/modules/search/search.service";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Command } from "@/components/ui/command";

function flattenPages(nodes: PageTreeNode[]): PageTreeNode[] {
  const out: PageTreeNode[] = [];
  for (const node of nodes) {
    out.push(node);
    out.push(...flattenPages(node.children));
  }
  return out;
}

const RECENT_KEY = "zuvigo:recent-searches";

export function CommandMenu({
  open,
  onOpenChange,
  workspaceId,
  workspaceSlug,
  pages,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  workspaceSlug: string;
  pages: PageTreeNode[];
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const flatPages = flattenPages(pages);
  const base = `/w/${workspaceSlug}`;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "p")) {
        e.preventDefault();
        onOpenChange(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      return;
    }
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw) as string[]);
    } catch {
      setRecent([]);
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const handle = window.setTimeout(() => {
      startTransition(async () => {
        const res = await searchWorkspaceAction({ workspaceId, query: q });
        if (res.success && res.data && typeof res.data === "object") {
          const data = res.data as { results?: SearchResult[] };
          setResults(data.results ?? []);
        }
      });
    }, 200);
    return () => window.clearTimeout(handle);
  }, [query, workspaceId]);

  function remember(q: string) {
    const next = [q, ...recent.filter((r) => r !== q)].slice(0, 6);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function go(path: string, searchTerm?: string) {
    if (searchTerm) remember(searchTerm);
    onOpenChange(false);
    router.push(path);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command shouldFilter={!query.trim()}>
        <CommandInput
          placeholder="Search or jump to…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {pending ? "Searching…" : "No results found"}
          </CommandEmpty>

          {results.length > 0 ? (
            <CommandGroup heading="Search results">
              {results.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`search-${item.id}-${item.title}`}
                  onSelect={() =>
                    go(`/w/${workspaceSlug}/pages/${item.id}`, query.trim())
                  }
                >
                  <FileText />
                  <span className="truncate">{item.title}</span>
                  <span className="ml-auto text-caption text-muted-foreground">
                    {item.matchType === "content" ? "Content" : "Title"}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {!query.trim() ? (
            <>
              <CommandGroup heading="Go to">
                <CommandItem onSelect={() => go(`${base}/tasks?preset=assigned`)}>
                  <Inbox />
                  Inbox
                  <CommandShortcut>G I</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => go(`${base}/tasks?preset=today`)}>
                  <Sun />
                  Today
                  <CommandShortcut>G T</CommandShortcut>
                </CommandItem>
                <CommandItem
                  onSelect={() => go(`${base}/tasks?preset=upcoming`)}
                >
                  <CalendarDays />
                  Upcoming
                  <CommandShortcut>G U</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => go(`${base}/calendar`)}>
                  <CalendarDays />
                  Calendar
                </CommandItem>
                <CommandItem onSelect={() => go(`${base}/projects`)}>
                  <FolderKanban />
                  Projects
                </CommandItem>
                <CommandItem onSelect={() => go(`${base}/tasks`)}>
                  <CheckSquare />
                  All tasks
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Actions">
                <CommandItem
                  onSelect={() => go(`${base}/tasks?new=1`)}
                >
                  <Plus />
                  Create task
                  <CommandShortcut>C</CommandShortcut>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    onOpenChange(false);
                    void createPageAction({
                      workspaceId,
                      workspaceSlug,
                    });
                  }}
                >
                  <Plus />
                  Create page
                </CommandItem>
                <CommandItem onSelect={() => go(`${base}/settings`)}>
                  <Settings />
                  Open settings
                </CommandItem>
                <CommandItem
                  onSelect={() =>
                    setTheme(theme === "dark" ? "light" : "dark")
                  }
                >
                  {theme === "dark" ? <Sun /> : <Moon />}
                  Toggle theme
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    onOpenChange(false);
                    void logoutAction();
                  }}
                >
                  <LogOut />
                  Sign out
                </CommandItem>
              </CommandGroup>
              {recent.length > 0 ? (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Recent searches">
                    {recent.map((r) => (
                      <CommandItem
                        key={r}
                        value={`recent-${r}`}
                        onSelect={() => setQuery(r)}
                      >
                        <FileText />
                        {r}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              ) : null}
              <CommandSeparator />
              <CommandGroup heading="Pages">
                {flatPages.slice(0, 12).map((page) => (
                  <CommandItem
                    key={page.id}
                    value={`page-${page.id}-${page.title}`}
                    onSelect={() =>
                      go(`/w/${workspaceSlug}/pages/${page.id}`)
                    }
                  >
                    <FileText />
                    <span className="truncate">
                      {page.icon ? `${page.icon} ` : ""}
                      {page.title}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
