import type { RowDataPacket } from "mysql2";
import { query } from "@/infrastructure/database/connection";

export type SearchTitleRow = RowDataPacket & {
  id: string;
  title: string;
  icon: string | null;
};

export type SearchContentRow = RowDataPacket & {
  page_id: string;
  title: string;
  icon: string | null;
  content: string | Record<string, unknown>;
};

export async function searchPageTitles(
  workspaceId: string,
  likePattern: string,
  limit: number
): Promise<SearchTitleRow[]> {
  return query<SearchTitleRow[]>(
    `SELECT id, title, icon FROM tbl_pages
     WHERE workspace_id = :workspaceId
       AND deleted_at IS NULL
       AND is_archived = 0
       AND title LIKE :like
     ORDER BY updated_at DESC
     LIMIT ${Math.max(1, Math.min(limit, 50))}`,
    { workspaceId, like: likePattern }
  );
}

export async function searchPageBlocksContent(
  workspaceId: string,
  likePattern: string,
  limit: number
): Promise<SearchContentRow[]> {
  return query<SearchContentRow[]>(
    `SELECT p.id AS page_id, p.title, p.icon, b.content
     FROM tbl_page_blocks b
     INNER JOIN tbl_pages p ON p.id = b.page_id
     WHERE b.workspace_id = :workspaceId
       AND b.deleted_at IS NULL
       AND p.deleted_at IS NULL
       AND p.is_archived = 0
       AND CAST(b.content AS CHAR) LIKE :like
     ORDER BY p.updated_at DESC
     LIMIT ${Math.max(1, Math.min(limit, 150))}`,
    { workspaceId, like: likePattern }
  );
}
