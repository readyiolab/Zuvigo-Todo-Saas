import { assertWorkspaceAccess } from "@/modules/workspaces/workspace.service";
import { notFoundError, validationError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { sortOrderBetween } from "@/modules/editor/editor.types";
import {
  createDatabaseSchema,
  createRowSchema,
  deleteRowSchema,
  updateCellSchema,
} from "@/modules/databases/database.schema";
import {
  createDatabaseWithDefaults,
  createRowRecord,
  findDatabaseRecord,
  findRow,
  getMaxRowSortOrder,
  listDatabaseRecords,
  listProperties,
  listRowsWithCells,
  listViews,
  softDeleteDatabase,
  softDeleteRow,
  upsertCell,
} from "@/modules/databases/database.repository";

function nextSort(last: string | null) {
  return sortOrderBetween(last, null);
}

export async function listDatabases(workspaceId: string, userId: string) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "pages.read",
  });
  return listDatabaseRecords(workspaceId);
}

export async function getDatabase(
  workspaceId: string,
  databaseId: string,
  userId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "pages.read",
  });
  const database = await findDatabaseRecord(databaseId, workspaceId);
  if (!database) throw notFoundError("Database not found");
  const [properties, views, rows] = await Promise.all([
    listProperties(databaseId),
    listViews(databaseId),
    listRowsWithCells(databaseId, workspaceId),
  ]);
  return { database, properties, views, rows };
}

export async function createDatabase(userId: string, raw: unknown) {
  const parsed = createDatabaseSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid database", parsed.error.flatten());
  }
  await assertWorkspaceAccess({
    workspaceId: parsed.data.workspaceId,
    userId,
    permission: "pages.create",
  });
  const id = await createDatabaseWithDefaults({
    workspaceId: parsed.data.workspaceId,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    createdBy: userId,
  });
  logger.info("database_created", { databaseId: id, userId });
  const database = await findDatabaseRecord(id, parsed.data.workspaceId);
  if (!database) throw notFoundError("Database not found");
  return database;
}

export async function deleteDatabase(
  workspaceId: string,
  databaseId: string,
  userId: string
) {
  await assertWorkspaceAccess({
    workspaceId,
    userId,
    permission: "pages.delete",
  });
  const existing = await findDatabaseRecord(databaseId, workspaceId);
  if (!existing) throw notFoundError("Database not found");
  await softDeleteDatabase(databaseId, workspaceId);
}

export async function createDatabaseRow(userId: string, raw: unknown) {
  const parsed = createRowSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid row", parsed.error.flatten());
  }
  await assertWorkspaceAccess({
    workspaceId: parsed.data.workspaceId,
    userId,
    permission: "pages.update",
  });
  const database = await findDatabaseRecord(
    parsed.data.databaseId,
    parsed.data.workspaceId
  );
  if (!database) throw notFoundError("Database not found");
  const last = await getMaxRowSortOrder(parsed.data.databaseId);
  const rowId = await createRowRecord({
    workspaceId: parsed.data.workspaceId,
    databaseId: parsed.data.databaseId,
    createdBy: userId,
    sortOrder: nextSort(last),
  });
  return rowId;
}

export async function updateDatabaseCell(userId: string, raw: unknown) {
  const parsed = updateCellSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid cell", parsed.error.flatten());
  }
  await assertWorkspaceAccess({
    workspaceId: parsed.data.workspaceId,
    userId,
    permission: "pages.update",
  });
  const row = await findRow(
    parsed.data.rowId,
    parsed.data.databaseId,
    parsed.data.workspaceId
  );
  if (!row) throw notFoundError("Row not found");
  await upsertCell({
    workspaceId: parsed.data.workspaceId,
    rowId: parsed.data.rowId,
    propertyId: parsed.data.propertyId,
    value: parsed.data.value,
  });
}

export async function deleteDatabaseRow(userId: string, raw: unknown) {
  const parsed = deleteRowSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Invalid delete", parsed.error.flatten());
  }
  await assertWorkspaceAccess({
    workspaceId: parsed.data.workspaceId,
    userId,
    permission: "pages.update",
  });
  const row = await findRow(
    parsed.data.rowId,
    parsed.data.databaseId,
    parsed.data.workspaceId
  );
  if (!row) throw notFoundError("Row not found");
  await softDeleteRow(parsed.data.rowId, parsed.data.workspaceId);
}
