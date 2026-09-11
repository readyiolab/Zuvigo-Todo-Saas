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
  createDatabase,
  createDatabaseRow,
  deleteDatabase,
  deleteDatabaseRow,
  updateDatabaseCell,
} from "@/modules/databases/database.service";

export type { ActionResult };

export async function createDatabaseAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  name: string;
  description?: string | null;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const database = await createDatabase(user.id, input);
    revalidatePath(`/w/${input.workspaceSlug}/databases`);
    redirect(`/w/${input.workspaceSlug}/databases/${database.id}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return failAction(error, "database_action_error");
  }
}

export async function deleteDatabaseAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  databaseId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await deleteDatabase(input.workspaceId, input.databaseId, user.id);
    revalidatePath(`/w/${input.workspaceSlug}/databases`);
    redirect(`/w/${input.workspaceSlug}/databases`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return failAction(error, "database_action_error");
  }
}

export async function createDatabaseRowAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  databaseId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const rowId = await createDatabaseRow(user.id, input);
    revalidatePath(`/w/${input.workspaceSlug}/databases/${input.databaseId}`);
    return okAction({ rowId });
  } catch (error) {
    return failAction(error, "database_action_error");
  }
}

export async function updateDatabaseCellAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  databaseId: string;
  rowId: string;
  propertyId: string;
  value: unknown;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await updateDatabaseCell(user.id, input);
    revalidatePath(`/w/${input.workspaceSlug}/databases/${input.databaseId}`);
    return okAction();
  } catch (error) {
    return failAction(error, "database_action_error");
  }
}

export async function deleteDatabaseRowAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  databaseId: string;
  rowId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await deleteDatabaseRow(user.id, input);
    revalidatePath(`/w/${input.workspaceSlug}/databases/${input.databaseId}`);
    return okAction();
  } catch (error) {
    return failAction(error, "database_action_error");
  }
}
