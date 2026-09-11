import type { RowDataPacket } from "mysql2";
import {
  execute,
  query,
  withTransaction,
} from "@/infrastructure/database/connection";
import type { BlockType, EditorBlock } from "@/modules/editor/editor.types";
import { createId } from "@/shared/utils/id";

type BlockRow = RowDataPacket & {
  id: string;
  workspace_id: string;
  page_id: string;
  parent_block_id: string | null;
  type: string;
  content: string | Record<string, unknown>;
  sort_order: string;
  version: number;
};

function parseContent(content: string | Record<string, unknown>) {
  if (typeof content === "string") {
    try {
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      return { text: content };
    }
  }
  return content;
}

export function mapBlock(row: BlockRow): EditorBlock {
  return {
    id: row.id,
    pageId: row.page_id,
    parentBlockId: row.parent_block_id,
    type: row.type as BlockType,
    content: parseContent(row.content),
    sortOrder: row.sort_order,
    version: row.version,
  };
}

export async function listBlocksByPage(pageId: string, workspaceId: string) {
  const rows = await query<BlockRow[]>(
    `SELECT * FROM tbl_page_blocks
     WHERE page_id = :pageId
       AND workspace_id = :workspaceId
       AND deleted_at IS NULL
     ORDER BY sort_order ASC, created_at ASC`,
    { pageId, workspaceId }
  );
  return rows.map(mapBlock);
}

export async function replacePageBlocks(input: {
  workspaceId: string;
  pageId: string;
  userId: string;
  blocks: Array<{
    id?: string;
    type: string;
    content: Record<string, unknown>;
    sortOrder: string;
    parentBlockId?: string | null;
  }>;
}) {
  await withTransaction(async (conn) => {
    await conn.execute(
      `UPDATE tbl_page_blocks
       SET deleted_at = CURRENT_TIMESTAMP(3)
       WHERE page_id = ? AND workspace_id = ? AND deleted_at IS NULL`,
      [input.pageId, input.workspaceId]
    );

    for (const block of input.blocks) {
      const id = block.id && block.id.length >= 10 ? block.id : createId();
      await conn.execute(
        `INSERT INTO tbl_page_blocks
          (id, workspace_id, page_id, parent_block_id, type, content, sort_order, version, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
         ON DUPLICATE KEY UPDATE
           parent_block_id = VALUES(parent_block_id),
           type = VALUES(type),
           content = VALUES(content),
           sort_order = VALUES(sort_order),
           version = version + 1,
           updated_by = VALUES(updated_by),
           deleted_at = NULL`,
        [
          id,
          input.workspaceId,
          input.pageId,
          block.parentBlockId ?? null,
          block.type,
          JSON.stringify(block.content),
          block.sortOrder,
          input.userId,
          input.userId,
        ]
      );
    }

    await conn.execute(
      `UPDATE tbl_pages SET updated_by = ?, updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ? AND workspace_id = ?`,
      [input.userId, input.pageId, input.workspaceId]
    );
  });
}

export async function reorderBlockRows(input: {
  workspaceId: string;
  pageId: string;
  userId: string;
  moves: Array<{
    blockId: string;
    parentBlockId: string | null;
    sortOrder: string;
    expectedVersion: number;
  }>;
}) {
  await withTransaction(async (conn) => {
    for (const move of input.moves) {
      const [result] = await conn.execute(
        `UPDATE tbl_page_blocks
         SET parent_block_id = ?, sort_order = ?, version = version + 1, updated_by = ?
         WHERE id = ?
           AND page_id = ?
           AND workspace_id = ?
           AND deleted_at IS NULL
           AND version = ?`,
        [
          move.parentBlockId,
          move.sortOrder,
          input.userId,
          move.blockId,
          input.pageId,
          input.workspaceId,
          move.expectedVersion,
        ]
      );
      const header = result as { affectedRows?: number };
      if (!header.affectedRows) {
        throw new Error("Block version conflict");
      }
    }
  });
}

export async function softDeleteBlocksForPage(pageId: string, workspaceId: string) {
  await execute(
    `UPDATE tbl_page_blocks
     SET deleted_at = CURRENT_TIMESTAMP(3)
     WHERE page_id = :pageId AND workspace_id = :workspaceId AND deleted_at IS NULL`,
    { pageId, workspaceId }
  );
}
