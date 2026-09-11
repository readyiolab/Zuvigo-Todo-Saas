import { assertWorkspaceAccess } from "@/modules/workspaces/workspace.service";
import {
  conflictError,
  notFoundError,
  validationError,
} from "@/shared/errors";
import { logger } from "@/shared/logger";
import {
  createPageSchema,
  movePageSchema,
  saveBlocksSchema,
  updatePageSchema,
} from "@/modules/pages/page.schema";
import type { PageTreeNode, PageRecord } from "@/modules/pages/page.types";
import {
  createPageRecord,
  duplicatePageRecord,
  findDeletedPageById,
  findPageById,
  getMaxSiblingSortOrder,
  listDeletedPages,
  listFavoritePageIds,
  listPagesByWorkspace,
  listRecentPages,
  movePageRecord,
  nextSortAfter,
  permanentlyDeletePageCascade,
  recordPageVisit,
  restorePageCascade,
  softDeletePageCascade,
  toggleFavoriteRecord,
  updatePageRecord,
  wouldCreateCycle,
} from "@/modules/pages/page.repository";
import {
  listBlocksByPage,
  replacePageBlocks,
  reorderBlockRows,
} from "@/modules/pages/page-block.repository";
import type { ReorderBlocksInput } from "@/modules/editor/editor.types";

export type { PageTreeNode, PageRecord };

function buildTree(pages: PageRecord[], favoriteIds: Set<string>): PageTreeNode[] {
  const map = new Map<string, PageTreeNode>();
  for (const page of pages) {
    map.set(page.id, {
      ...page,
      children: [],
      isFavorite: favoriteIds.has(page.id),
    });
  }

  const roots: PageTreeNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: PageTreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder.localeCompare(b.sortOrder));
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}

export async function listPages(workspaceId: string, userId: string) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "pages.read",
  });
  const [pages, favorites] = await Promise.all([
    listPagesByWorkspace(workspaceId),
    listFavoritePageIds(workspaceId, userId),
  ]);
  return buildTree(pages, new Set(favorites));
}

export async function listPagesFlat(workspaceId: string, userId: string) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "pages.read",
  });
  return listPagesByWorkspace(workspaceId);
}

export async function getPage(
  workspaceId: string,
  pageId: string,
  userId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "pages.read",
  });
  const page = await findPageById(pageId, workspaceId);
  if (!page) throw notFoundError("Page not found");
  const blocks = await listBlocksByPage(pageId, workspaceId);
  const favorites = await listFavoritePageIds(workspaceId, userId);
  return {
    page: { ...page, isFavorite: favorites.includes(pageId) },
    blocks,
  };
}

export async function createPage(userId: string, raw: unknown) {
  const parsed = createPageSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid page data", parsed.error.flatten());
  }

  await assertWorkspaceAccess({
    workspaceId: parsed.data.workspaceId,
    userId,
    permission: "pages.create",
  });

  if (parsed.data.parentId) {
    const parent = await findPageById(
      parsed.data.parentId,
      parsed.data.workspaceId
    );
    if (!parent) throw notFoundError("Parent page not found");
  }

  const last = await getMaxSiblingSortOrder(
    parsed.data.workspaceId,
    parsed.data.parentId ?? null
  );

  const pageId = await createPageRecord({
    workspaceId: parsed.data.workspaceId,
    parentId: parsed.data.parentId ?? null,
    title: parsed.data.title || "Untitled",
    icon: parsed.data.icon ?? null,
    createdBy: userId,
    sortOrder: nextSortAfter(last),
  });

  logger.info("page_created", { pageId, userId });
  const page = await findPageById(pageId, parsed.data.workspaceId);
  if (!page) throw notFoundError("Page not found");
  return page;
}

export async function updatePage(
  workspaceId: string,
  pageId: string,
  userId: string,
  raw: unknown
) {
  const parsed = updatePageSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid page update", parsed.error.flatten());
  }

  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "pages.update",
  });

  const existing = await findPageById(pageId, workspaceId);
  if (!existing) throw notFoundError("Page not found");

  await updatePageRecord(pageId, workspaceId, {
    ...parsed.data,
    updatedBy: userId,
  });

  return findPageById(pageId, workspaceId);
}

export async function deletePage(
  workspaceId: string,
  pageId: string,
  userId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "pages.delete",
  });
  const existing = await findPageById(pageId, workspaceId);
  if (!existing) throw notFoundError("Page not found");

  await softDeletePageCascade(pageId, workspaceId);
  logger.info("page_deleted", { pageId, userId });
}

export async function listTrash(workspaceId: string, userId: string) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "pages.read",
  });
  return listDeletedPages(workspaceId);
}

export async function restorePage(
  workspaceId: string,
  pageId: string,
  userId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "pages.update",
  });
  const existing = await findDeletedPageById(pageId, workspaceId);
  if (!existing) throw notFoundError("Page not found in trash");
  await restorePageCascade(pageId, workspaceId);
  logger.info("page_restored", { pageId, userId });
}

export async function permanentlyDeletePage(
  workspaceId: string,
  pageId: string,
  userId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "pages.delete",
  });
  const existing = await findDeletedPageById(pageId, workspaceId);
  if (!existing) throw notFoundError("Page not found in trash");
  await permanentlyDeletePageCascade(pageId, workspaceId);
  logger.info("page_permanently_deleted", { pageId, userId });
}

export async function duplicatePage(
  workspaceId: string,
  pageId: string,
  userId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "pages.create",
  });
  const existing = await findPageById(pageId, workspaceId);
  if (!existing) throw notFoundError("Page not found");
  const newId = await duplicatePageRecord({
    sourcePageId: pageId,
    workspaceId,
    userId,
  });
  if (!newId) throw notFoundError("Page not found");
  const page = await findPageById(newId, workspaceId);
  if (!page) throw notFoundError("Duplicated page not found");
  return page;
}

export async function trackPageVisit(
  workspaceId: string,
  pageId: string,
  userId: string
) {
  try {
    await assertWorkspaceAccess({
      workspaceId,
      userId,
      permission: "pages.read",
    });
    const page = await findPageById(pageId, workspaceId);
    if (!page) return;
    await recordPageVisit({ workspaceId, pageId, userId });
  } catch (error) {
    logger.error("page_visit_failed", {
      workspaceId,
      pageId,
      userId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function getRecentPages(
  workspaceId: string,
  userId: string,
  limit = 8
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "pages.read",
  });
  try {
    return await listRecentPages(workspaceId, userId, limit);
  } catch (error) {
    logger.error("recent_pages_failed", {
      workspaceId,
      userId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return [];
  }
}

export async function movePage(userId: string, raw: unknown) {
  const parsed = movePageSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid page move", parsed.error.flatten());
  }

  await assertWorkspaceAccess({
    workspaceId: parsed.data.workspaceId,
    userId,
    permission: "pages.update",
  });

  const page = await findPageById(parsed.data.pageId, parsed.data.workspaceId);
  if (!page) throw notFoundError("Page not found");

  if (parsed.data.parentId === parsed.data.pageId) {
    throw validationError("A page cannot be its own parent");
  }

  if (parsed.data.parentId) {
    const parent = await findPageById(
      parsed.data.parentId,
      parsed.data.workspaceId
    );
    if (!parent) throw notFoundError("Parent page not found");
    const cycle = await wouldCreateCycle(
      parsed.data.workspaceId,
      parsed.data.pageId,
      parsed.data.parentId
    );
    if (cycle) {
      throw validationError("Cannot move a page into its own descendant");
    }
  }

  await movePageRecord({
    pageId: parsed.data.pageId,
    workspaceId: parsed.data.workspaceId,
    parentId: parsed.data.parentId,
    sortOrder: parsed.data.sortOrder,
    updatedBy: userId,
  });
}

export async function toggleFavorite(
  workspaceId: string,
  pageId: string,
  userId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "pages.read",
  });
  const page = await findPageById(pageId, workspaceId);
  if (!page) throw notFoundError("Page not found");
  return toggleFavoriteRecord({ workspaceId, pageId, userId });
}

export async function savePageBlocks(userId: string, raw: unknown) {
  const parsed = saveBlocksSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid blocks payload", parsed.error.flatten());
  }

  await assertWorkspaceAccess({
    workspaceId: parsed.data.workspaceId,
    userId,
    permission: "pages.update",
  });

  const page = await findPageById(parsed.data.pageId, parsed.data.workspaceId);
  if (!page) throw notFoundError("Page not found");

  await replacePageBlocks({
    workspaceId: parsed.data.workspaceId,
    pageId: parsed.data.pageId,
    userId,
    blocks: parsed.data.blocks,
  });

  return listBlocksByPage(parsed.data.pageId, parsed.data.workspaceId);
}

export async function reorderBlocks(input: ReorderBlocksInput) {
  await assertWorkspaceAccess({
    workspaceId: input.workspaceId,
    userId: input.userId,
    permission: "pages.update",
  });

  try {
    await reorderBlockRows(input);
  } catch {
    throw conflictError("Page was updated elsewhere. Refresh and try again.");
  }
}

export async function listBlocks(
  workspaceId: string,
  pageId: string,
  userId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "pages.read",
  });
  return listBlocksByPage(pageId, workspaceId);
}
