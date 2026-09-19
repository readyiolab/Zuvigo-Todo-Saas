import { assertWorkspaceAccess } from "@/modules/workspaces/workspace.service";
import {
  searchPageBlocksContent,
  searchPageTitles,
} from "@/modules/search/search.repository";

export type SearchResult = {
  id: string;
  title: string;
  icon: string | null;
  matchType: "title" | "content";
  snippet?: string;
};

export async function searchWorkspace(
  workspaceId: string,
  userId: string,
  q: string,
  limit = 20
): Promise<SearchResult[]> {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "pages.read",
  });

  const term = q.trim();
  if (!term) return [];

  const like = `%${term.replace(/[%_]/g, "\\$&")}%`;
  const capped = Math.max(1, Math.min(limit, 50));

  const titleRows = await searchPageTitles(workspaceId, like, capped);

  const seen = new Set(titleRows.map((r) => r.id));
  const results: SearchResult[] = titleRows.map((r) => ({
    id: r.id,
    title: r.title,
    icon: r.icon,
    matchType: "title" as const,
  }));

  const remaining = capped - results.length;
  if (remaining <= 0) return results;

  const contentRows = await searchPageBlocksContent(
    workspaceId,
    like,
    capped * 3
  );

  for (const row of contentRows) {
    if (seen.has(row.page_id)) continue;
    seen.add(row.page_id);
    const raw =
      typeof row.content === "string"
        ? row.content
        : JSON.stringify(row.content ?? {});
    results.push({
      id: row.page_id,
      title: row.title,
      icon: row.icon,
      matchType: "content",
      snippet: raw.slice(0, 120),
    });
    if (results.length >= capped) break;
  }

  return results;
}
