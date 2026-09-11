"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/modules/auth/auth.service";
import {
  type ActionResult,
  failAction,
  isRedirectError,
  okAction,
} from "@/shared/actions/result";
import {
  createPage,
  deletePage,
  duplicatePage,
  movePage,
  permanentlyDeletePage,
  restorePage,
  savePageBlocks,
  toggleFavorite,
  trackPageVisit,
  updatePage,
} from "@/modules/pages/page.service";

export type { ActionResult };

export async function createPageAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  title?: string;
  parentId?: string | null;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const page = await createPage(user.id, {
      workspaceId: input.workspaceId,
      title: input.title,
      parentId: input.parentId ?? null,
    });
    revalidatePath(`/w/${input.workspaceSlug}`);
    redirect(`/w/${input.workspaceSlug}/pages/${page.id}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return failAction(error, "page_action_error");
  }
}

export async function updatePageTitleAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  pageId: string;
  title: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await updatePage(input.workspaceId, input.pageId, user.id, {
      title: input.title,
    });
    revalidatePath(`/w/${input.workspaceSlug}/pages/${input.pageId}`);
    revalidatePath(`/w/${input.workspaceSlug}`);
    return okAction();
  } catch (error) {
    return failAction(error, "page_action_error");
  }
}

export async function updatePageIconAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  pageId: string;
  icon: string | null;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await updatePage(input.workspaceId, input.pageId, user.id, {
      icon: input.icon,
    });
    revalidatePath(`/w/${input.workspaceSlug}/pages/${input.pageId}`);
    revalidatePath(`/w/${input.workspaceSlug}`);
    return okAction();
  } catch (error) {
    return failAction(error, "page_action_error");
  }
}

export async function deletePageAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  pageId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await deletePage(input.workspaceId, input.pageId, user.id);
    revalidatePath(`/w/${input.workspaceSlug}`);
    revalidatePath(`/w/${input.workspaceSlug}/trash`);
    redirect(`/w/${input.workspaceSlug}/pages`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return failAction(error, "page_action_error");
  }
}

export async function archivePageAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  pageId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await deletePage(input.workspaceId, input.pageId, user.id);
    revalidatePath(`/w/${input.workspaceSlug}`);
    revalidatePath(`/w/${input.workspaceSlug}/trash`);
    return okAction();
  } catch (error) {
    return failAction(error, "page_action_error");
  }
}

export async function restorePageAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  pageId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await restorePage(input.workspaceId, input.pageId, user.id);
    revalidatePath(`/w/${input.workspaceSlug}`);
    revalidatePath(`/w/${input.workspaceSlug}/trash`);
    return okAction();
  } catch (error) {
    return failAction(error, "page_action_error");
  }
}

export async function permanentlyDeletePageAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  pageId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await permanentlyDeletePage(input.workspaceId, input.pageId, user.id);
    revalidatePath(`/w/${input.workspaceSlug}`);
    revalidatePath(`/w/${input.workspaceSlug}/trash`);
    return okAction();
  } catch (error) {
    return failAction(error, "page_action_error");
  }
}

export async function duplicatePageAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  pageId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const page = await duplicatePage(input.workspaceId, input.pageId, user.id);
    revalidatePath(`/w/${input.workspaceSlug}`);
    redirect(`/w/${input.workspaceSlug}/pages/${page.id}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return failAction(error, "page_action_error");
  }
}

export async function movePageAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  pageId: string;
  parentId: string | null;
  sortOrder: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await movePage(user.id, input);
    revalidatePath(`/w/${input.workspaceSlug}`);
    return okAction();
  } catch (error) {
    return failAction(error, "page_action_error");
  }
}

export async function toggleFavoriteAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  pageId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const favorited = await toggleFavorite(
      input.workspaceId,
      input.pageId,
      user.id
    );
    revalidatePath(`/w/${input.workspaceSlug}`);
    return okAction({ favorited });
  } catch (error) {
    return failAction(error, "page_action_error");
  }
}

export async function trackPageVisitAction(input: {
  workspaceId: string;
  pageId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await trackPageVisit(input.workspaceId, input.pageId, user.id);
    return okAction();
  } catch (error) {
    return failAction(error, "page_action_error");
  }
}

export async function saveBlocksAction(input: {
  workspaceId: string;
  pageId: string;
  blocks: Array<{
    id?: string;
    type: string;
    content: Record<string, unknown>;
    sortOrder: string;
    parentBlockId?: string | null;
  }>;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const blocks = await savePageBlocks(user.id, input);
    return okAction({ blocks });
  } catch (error) {
    return failAction(error, "page_action_error");
  }
}
