import { assertWorkspaceAccess } from "@/modules/workspaces/workspace.service";
import { query, type RowDataPacket } from "@/infrastructure/database/connection";

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

  type TitleRow = RowDataPacket & {
    id: string;
    title: string;
    icon: string | null;
  };

  const titleRows = await query<TitleRow[]>(
    `SELECT id, title, icon FROM tbl_pages
     WHERE workspace_id = :workspaceId
       AND deleted_at IS NULL
       AND is_archived = 0
       AND title LIKE :like
     ORDER BY updated_at DESC
     LIMIT ${capped}`,
    { workspaceId, like }
  );

  const seen = new Set(titleRows.map((r) => r.id));
  const results: SearchResult[] = titleRows.map((r) => ({
    id: r.id,
    title: r.title,
    icon: r.icon,
    matchType: "title" as const,
  }));

  const remaining = capped - results.length;
  if (remaining <= 0) return results;

  type ContentRow = RowDataPacket & {
    page_id: string;
    title: string;
    icon: string | null;
    content: string | Record<string, unknown>;
  };

  const contentRows = await query<ContentRow[]>(
    `SELECT p.id AS page_id, p.title, p.icon, b.content
     FROM tbl_page_blocks b
     INNER JOIN tbl_pages p ON p.id = b.page_id
     WHERE b.workspace_id = :workspaceId
       AND b.deleted_at IS NULL
       AND p.deleted_at IS NULL
       AND p.is_archived = 0
       AND CAST(b.content AS CHAR) LIKE :like
     ORDER BY p.updated_at DESC
     LIMIT ${capped * 3}`,
    { workspaceId, like }
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
