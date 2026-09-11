/**
 * Block editor contracts.
 *
 * Persistence lives in modules/pages (tbl_page_blocks).
 * TipTap maps to/from EditorBlock via tiptap-mapper.
 */

export type BlockType =
  | "paragraph"
  | "heading_1"
  | "heading_2"
  | "heading_3"
  | "bulleted_list"
  | "numbered_list"
  | "checklist"
  | "quote"
  | "code"
  | "divider"
  | "link"
  | "image"
  | "file"
  | "callout"
  | "table";

export type EditorBlock = {
  id: string;
  pageId: string;
  parentBlockId: string | null;
  type: BlockType;
  content: Record<string, unknown>;
  sortOrder: string;
  version: number;
};

/** Midpoint-style sort key helper for DnD inserts between neighbors. */
export function sortOrderBetween(before: string | null, after: string | null): string {
  if (!before && !after) return "a0";
  if (!before) return `a${after}`;
  if (!after) return `${before}z`;
  return `${before}m${after}`.slice(0, 64);
}

export type ReorderBlocksInput = {
  workspaceId: string;
  userId: string;
  pageId: string;
  moves: Array<{
    blockId: string;
    parentBlockId: string | null;
    sortOrder: string;
    expectedVersion: number;
  }>;
};
