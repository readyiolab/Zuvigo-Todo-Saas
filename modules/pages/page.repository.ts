import type { RowDataPacket } from "mysql2";
import {
  execute,
  query,
  withTransaction,
} from "@/infrastructure/database/connection";
import { createId } from "@/shared/utils/id";
import { sortOrderBetween } from "@/modules/editor/editor.types";

import type { PageRecord } from "@/modules/pages/page.types";

export type { PageRecord };

export type PageRow = RowDataPacket & {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  title: string;
  icon: string | null;
  cover_file_id: string | null;
  sort_order: string;
  is_archived: number;
  created_by: string;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export function mapPage(row: PageRow): PageRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    parentId: row.parent_id,
    title: row.title,
    icon: row.icon,
    coverFileId: row.cover_file_id,
    sortOrder: row.sort_order,
    isArchived: Boolean(row.is_archived),
    createdBy: row.created_by,
    updatedAt: row.updated_at,
  };
}

export async function listPagesByWorkspace(workspaceId: string) {
  const rows = await query<PageRow[]>(
    `SELECT * FROM tbl_pages
     WHERE workspace_id = :workspaceId
       AND deleted_at IS NULL
       AND is_archived = 0
     ORDER BY parent_id IS NOT NULL, sort_order ASC, created_at ASC`,
    { workspaceId }
  );
  return rows.map(mapPage);
}

export async function findPageById(pageId: string, workspaceId: string) {
  const rows = await query<PageRow[]>(
    `SELECT * FROM tbl_pages
     WHERE id = :pageId AND workspace_id = :workspaceId AND deleted_at IS NULL
     LIMIT 1`,
    { pageId, workspaceId }
  );
  return rows[0] ? mapPage(rows[0]) : null;
}

export async function getMaxSiblingSortOrder(
  workspaceId: string,
  parentId: string | null
) {
  type Row = RowDataPacket & { sort_order: string | null };
  const rows = await query<Row[]>(
    `SELECT sort_order FROM tbl_pages
     WHERE workspace_id = :workspaceId
       AND deleted_at IS NULL
       AND ${parentId ? "parent_id = :parentId" : "parent_id IS NULL"}
     ORDER BY sort_order DESC
     LIMIT 1`,
    parentId ? { workspaceId, parentId } : { workspaceId }
  );
  return rows[0]?.sort_order ?? null;
}

export async function createPageRecord(input: {
  workspaceId: string;
  parentId: string | null;
  title: string;
  icon: string | null;
  createdBy: string;
  sortOrder: string;
}) {
  const pageId = createId();
  const blockId = createId();

  await withTransaction(async (conn) => {
    await conn.execute(
      `INSERT INTO tbl_pages
        (id, workspace_id, parent_id, title, icon, sort_order, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pageId,
        input.workspaceId,
        input.parentId,
        input.title,
        input.icon,
        input.sortOrder,
        input.createdBy,
        input.createdBy,
      ]
    );

    await conn.execute(
      `INSERT INTO tbl_page_blocks
        (id, workspace_id, page_id, parent_block_id, type, content, sort_order, version, created_by, updated_by)
       VALUES (?, ?, ?, NULL, 'paragraph', ?, 'a0', 1, ?, ?)`,
      [
        blockId,
        input.workspaceId,
        pageId,
        JSON.stringify({ text: "" }),
        input.createdBy,
        input.createdBy,
      ]
    );

    await conn.execute(
      `INSERT INTO tbl_activity_logs
        (id, workspace_id, actor_user_id, action, resource_type, resource_id, metadata)
       VALUES (?, ?, ?, 'page.created', 'page', ?, ?)`,
      [
        createId(),
        input.workspaceId,
        input.createdBy,
        pageId,
        JSON.stringify({ title: input.title }),
      ]
    );
  });

  return pageId;
}

export async function updatePageRecord(
  pageId: string,
  workspaceId: string,
  data: {
    title?: string;
    icon?: string | null;
    isArchived?: boolean;
    updatedBy: string;
  }
) {
  const sets: string[] = ["updated_by = :updatedBy"];
  const params: Record<string, unknown> = {
    pageId,
    workspaceId,
    updatedBy: data.updatedBy,
  };

  if (data.title !== undefined) {
    sets.push("title = :title");
    params.title = data.title;
  }
  if (data.icon !== undefined) {
    sets.push("icon = :icon");
    params.icon = data.icon;
  }
  if (data.isArchived !== undefined) {
    sets.push("is_archived = :isArchived");
    params.isArchived = data.isArchived ? 1 : 0;
  }

  await execute(
    `UPDATE tbl_pages SET ${sets.join(", ")}
     WHERE id = :pageId AND workspace_id = :workspaceId AND deleted_at IS NULL`,
    params
  );
}

export async function softDeletePage(pageId: string, workspaceId: string) {
  await execute(
    `UPDATE tbl_pages
     SET deleted_at = CURRENT_TIMESTAMP(3), is_archived = 1
     WHERE id = :pageId AND workspace_id = :workspaceId AND deleted_at IS NULL`,
    { pageId, workspaceId }
  );
}

/** Soft-delete a page and all descendants in one transaction. */
export async function softDeletePageCascade(pageId: string, workspaceId: string) {
  await withTransaction(async (conn) => {
    const [rows] = await conn.execute<PageRow[]>(
      `SELECT id, parent_id FROM tbl_pages
       WHERE workspace_id = ? AND deleted_at IS NULL`,
      [workspaceId]
    );
    const childrenMap = new Map<string, string[]>();
    for (const row of rows) {
      if (!row.parent_id) continue;
      const list = childrenMap.get(row.parent_id) ?? [];
      list.push(row.id);
      childrenMap.set(row.parent_id, list);
    }

    const toDelete: string[] = [];
    const walk = (id: string) => {
      toDelete.push(id);
      for (const child of childrenMap.get(id) ?? []) walk(child);
    };
    walk(pageId);

    if (toDelete.length === 0) return;

    const placeholders = toDelete.map(() => "?").join(",");
    await conn.execute(
      `UPDATE tbl_page_blocks
       SET deleted_at = CURRENT_TIMESTAMP(3)
       WHERE workspace_id = ? AND page_id IN (${placeholders}) AND deleted_at IS NULL`,
      [workspaceId, ...toDelete]
    );
    await conn.execute(
      `UPDATE tbl_pages
       SET deleted_at = CURRENT_TIMESTAMP(3), is_archived = 1
       WHERE workspace_id = ? AND id IN (${placeholders}) AND deleted_at IS NULL`,
      [workspaceId, ...toDelete]
    );
    await conn.execute(
      `DELETE FROM tbl_page_favorites
       WHERE workspace_id = ? AND page_id IN (${placeholders})`,
      [workspaceId, ...toDelete]
    );
  });
}

export async function listDeletedPages(workspaceId: string) {
  const rows = await query<PageRow[]>(
    `SELECT * FROM tbl_pages
     WHERE workspace_id = :workspaceId AND deleted_at IS NOT NULL
     ORDER BY deleted_at DESC`,
    { workspaceId }
  );
  return rows.map(mapPage);
}

export async function findDeletedPageById(pageId: string, workspaceId: string) {
  const rows = await query<PageRow[]>(
    `SELECT * FROM tbl_pages
     WHERE id = :pageId AND workspace_id = :workspaceId AND deleted_at IS NOT NULL
     LIMIT 1`,
    { pageId, workspaceId }
  );
  return rows[0] ? mapPage(rows[0]) : null;
}

export async function restorePageCascade(pageId: string, workspaceId: string) {
  await withTransaction(async (conn) => {
    const [rows] = await conn.execute<PageRow[]>(
      `SELECT id, parent_id, deleted_at FROM tbl_pages WHERE workspace_id = ?`,
      [workspaceId]
    );
    const byId = new Map(rows.map((r) => [r.id, r]));
    const root = byId.get(pageId);
    if (!root || !root.deleted_at) return;

    const childrenMap = new Map<string, string[]>();
    for (const row of rows) {
      if (!row.parent_id) continue;
      const list = childrenMap.get(row.parent_id) ?? [];
      list.push(row.id);
      childrenMap.set(row.parent_id, list);
    }

    const toRestore: string[] = [];
    const walk = (id: string) => {
      const node = byId.get(id);
      if (!node?.deleted_at) return;
      toRestore.push(id);
      for (const child of childrenMap.get(id) ?? []) walk(child);
    };
    walk(pageId);

    if (toRestore.length === 0) return;

    // If parent is still deleted, re-parent to root to avoid orphans
    const parent = root.parent_id ? byId.get(root.parent_id) : null;
    if (parent?.deleted_at) {
      await conn.execute(
        `UPDATE tbl_pages SET parent_id = NULL WHERE id = ? AND workspace_id = ?`,
        [pageId, workspaceId]
      );
    }

    const placeholders = toRestore.map(() => "?").join(",");
    await conn.execute(
      `UPDATE tbl_pages
       SET deleted_at = NULL, is_archived = 0
       WHERE workspace_id = ? AND id IN (${placeholders})`,
      [workspaceId, ...toRestore]
    );
    await conn.execute(
      `UPDATE tbl_page_blocks
       SET deleted_at = NULL
       WHERE workspace_id = ? AND page_id IN (${placeholders}) AND deleted_at IS NOT NULL`,
      [workspaceId, ...toRestore]
    );
  });
}

export async function permanentlyDeletePageCascade(
  pageId: string,
  workspaceId: string
) {
  await withTransaction(async (conn) => {
    const [rows] = await conn.execute<PageRow[]>(
      `SELECT id, parent_id FROM tbl_pages
       WHERE workspace_id = ? AND deleted_at IS NOT NULL`,
      [workspaceId]
    );
    const childrenMap = new Map<string, string[]>();
    for (const row of rows) {
      if (!row.parent_id) continue;
      const list = childrenMap.get(row.parent_id) ?? [];
      list.push(row.id);
      childrenMap.set(row.parent_id, list);
    }

    const toDelete: string[] = [];
    const walk = (id: string) => {
      toDelete.push(id);
      for (const child of childrenMap.get(id) ?? []) walk(child);
    };
    walk(pageId);
    if (toDelete.length === 0) return;

    const placeholders = toDelete.map(() => "?").join(",");
    await conn.execute(
      `DELETE FROM tbl_page_favorites WHERE workspace_id = ? AND page_id IN (${placeholders})`,
      [workspaceId, ...toDelete]
    );
    await conn.execute(
      `DELETE FROM tbl_page_visits WHERE workspace_id = ? AND page_id IN (${placeholders})`,
      [workspaceId, ...toDelete]
    );
    await conn.execute(
      `DELETE FROM tbl_page_blocks WHERE workspace_id = ? AND page_id IN (${placeholders})`,
      [workspaceId, ...toDelete]
    );
    await conn.execute(
      `DELETE FROM tbl_pages WHERE workspace_id = ? AND id IN (${placeholders})`,
      [workspaceId, ...toDelete]
    );
  });
}

export async function duplicatePageRecord(input: {
  sourcePageId: string;
  workspaceId: string;
  userId: string;
  title?: string;
}) {
  return withTransaction(async (conn) => {
    const [pages] = await conn.execute<PageRow[]>(
      `SELECT * FROM tbl_pages
       WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL LIMIT 1`,
      [input.sourcePageId, input.workspaceId]
    );
    const source = pages[0];
    if (!source) return null;

    type BlockRow = RowDataPacket & {
      id: string;
      parent_block_id: string | null;
      type: string;
      content: unknown;
      sort_order: string;
    };
    const [blocks] = await conn.execute<BlockRow[]>(
      `SELECT id, parent_block_id, type, content, sort_order FROM tbl_page_blocks
       WHERE page_id = ? AND workspace_id = ? AND deleted_at IS NULL
       ORDER BY sort_order ASC`,
      [input.sourcePageId, input.workspaceId]
    );

    const [maxRows] = await conn.execute<Array<RowDataPacket & { sort_order: string | null }>>(
      `SELECT sort_order FROM tbl_pages
       WHERE workspace_id = ? AND deleted_at IS NULL
         AND ${source.parent_id ? "parent_id = ?" : "parent_id IS NULL"}
       ORDER BY sort_order DESC LIMIT 1`,
      source.parent_id
        ? [input.workspaceId, source.parent_id]
        : [input.workspaceId]
    );
    const sortOrder = nextSortAfter(maxRows[0]?.sort_order ?? null);
    const newPageId = createId();
    const title = input.title ?? `${source.title} (copy)`;

    await conn.execute(
      `INSERT INTO tbl_pages
        (id, workspace_id, parent_id, title, icon, sort_order, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newPageId,
        input.workspaceId,
        source.parent_id,
        title,
        source.icon,
        sortOrder,
        input.userId,
        input.userId,
      ]
    );

    const idMap = new Map<string, string>();
    for (const block of blocks) {
      idMap.set(block.id, createId());
    }

    for (const block of blocks) {
      const newId = idMap.get(block.id)!;
      const parentBlockId = block.parent_block_id
        ? (idMap.get(block.parent_block_id) ?? null)
        : null;
      await conn.execute(
        `INSERT INTO tbl_page_blocks
          (id, workspace_id, page_id, parent_block_id, type, content, sort_order, version, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          newId,
          input.workspaceId,
          newPageId,
          parentBlockId,
          block.type,
          typeof block.content === "string"
            ? block.content
            : JSON.stringify(block.content ?? {}),
          block.sort_order,
          input.userId,
          input.userId,
        ]
      );
    }

    if (blocks.length === 0) {
      await conn.execute(
        `INSERT INTO tbl_page_blocks
          (id, workspace_id, page_id, parent_block_id, type, content, sort_order, version, created_by, updated_by)
         VALUES (?, ?, ?, NULL, 'paragraph', ?, 'a0', 1, ?, ?)`,
        [
          createId(),
          input.workspaceId,
          newPageId,
          JSON.stringify({ text: "" }),
          input.userId,
          input.userId,
        ]
      );
    }

    return newPageId;
  });
}

export async function recordPageVisit(input: {
  workspaceId: string;
  pageId: string;
  userId: string;
}) {
  await execute(
    `INSERT INTO tbl_page_visits (id, workspace_id, page_id, user_id, visited_at)
     VALUES (:id, :workspaceId, :pageId, :userId, CURRENT_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE visited_at = CURRENT_TIMESTAMP(3)`,
    {
      id: createId(),
      workspaceId: input.workspaceId,
      pageId: input.pageId,
      userId: input.userId,
    }
  );
}

export async function listRecentPages(
  workspaceId: string,
  userId: string,
  limit = 8
) {
  const rows = await query<PageRow[]>(
    `SELECT p.* FROM tbl_page_visits v
     INNER JOIN tbl_pages p ON p.id = v.page_id
     WHERE v.workspace_id = :workspaceId
       AND v.user_id = :userId
       AND p.deleted_at IS NULL
       AND p.is_archived = 0
     ORDER BY v.visited_at DESC
     LIMIT ${Math.max(1, Math.min(limit, 50))}`,
    { workspaceId, userId }
  );
  return rows.map(mapPage);
}

export async function wouldCreateCycle(
  workspaceId: string,
  pageId: string,
  newParentId: string
): Promise<boolean> {
  const seen = new Set<string>();
  let cursor: string | null = newParentId;

  for (let i = 0; i < 1000 && cursor; i += 1) {
    if (cursor === pageId) return true;
    if (seen.has(cursor)) return true;
    seen.add(cursor);

    type ParentRow = RowDataPacket & { parent_id: string | null };
    const parentRows: ParentRow[] = await query<ParentRow[]>(
      `SELECT parent_id FROM tbl_pages
       WHERE id = :id AND workspace_id = :workspaceId AND deleted_at IS NULL
       LIMIT 1`,
      { id: cursor, workspaceId }
    );
    cursor = parentRows[0]?.parent_id ?? null;
  }

  return false;
}

export async function movePageRecord(input: {
  pageId: string;
  workspaceId: string;
  parentId: string | null;
  sortOrder: string;
  updatedBy: string;
}) {
  await execute(
    `UPDATE tbl_pages
     SET parent_id = :parentId, sort_order = :sortOrder, updated_by = :updatedBy
     WHERE id = :pageId AND workspace_id = :workspaceId AND deleted_at IS NULL`,
    {
      parentId: input.parentId,
      sortOrder: input.sortOrder,
      updatedBy: input.updatedBy,
      pageId: input.pageId,
      workspaceId: input.workspaceId,
    }
  );
}

export async function listFavoritePageIds(workspaceId: string, userId: string) {
  type Row = RowDataPacket & { page_id: string };
  const rows = await query<Row[]>(
    `SELECT page_id FROM tbl_page_favorites
     WHERE workspace_id = :workspaceId AND user_id = :userId`,
    { workspaceId, userId }
  );
  return rows.map((r) => r.page_id);
}

export async function toggleFavoriteRecord(input: {
  workspaceId: string;
  pageId: string;
  userId: string;
}) {
  type Row = RowDataPacket & { id: string };
  const existing = await query<Row[]>(
    `SELECT id FROM tbl_page_favorites
     WHERE page_id = :pageId AND user_id = :userId LIMIT 1`,
    { pageId: input.pageId, userId: input.userId }
  );

  if (existing[0]) {
    await execute(`DELETE FROM tbl_page_favorites WHERE id = :id`, {
      id: existing[0].id,
    });
    return false;
  }

  await execute(
    `INSERT INTO tbl_page_favorites (id, workspace_id, page_id, user_id)
     VALUES (:id, :workspaceId, :pageId, :userId)`,
    {
      id: createId(),
      workspaceId: input.workspaceId,
      pageId: input.pageId,
      userId: input.userId,
    }
  );
  return true;
}

export function nextSortAfter(last: string | null) {
  return sortOrderBetween(last, null);
}
