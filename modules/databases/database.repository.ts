import type { RowDataPacket } from "mysql2";
import {
  execute,
  query,
  withTransaction,
} from "@/infrastructure/database/connection";
import { createId } from "@/shared/utils/id";
import type {
  DatabaseProperty,
  DatabasePropertyType,
  DatabaseRecord,
  DatabaseRow,
  DatabaseView,
} from "@/modules/databases/database.types";

type DbRow = RowDataPacket & {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_by: string;
  updated_at: Date;
};

type PropRow = RowDataPacket & {
  id: string;
  database_id: string;
  name: string;
  type: DatabasePropertyType;
  config: string | Record<string, unknown> | null;
  sort_order: string;
};

type ViewRow = RowDataPacket & {
  id: string;
  database_id: string;
  name: string;
  type: "table" | "board" | "list" | "calendar";
  config: string | Record<string, unknown> | null;
  sort_order: string;
};

type RowRow = RowDataPacket & {
  id: string;
  database_id: string;
  sort_order: string;
};

type CellRow = RowDataPacket & {
  row_id: string;
  property_id: string;
  value_json: string | Record<string, unknown> | null;
};

function parseJson(
  value: string | Record<string, unknown> | null
): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function mapDatabase(row: DbRow): DatabaseRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
  };
}

function mapProperty(row: PropRow): DatabaseProperty {
  return {
    id: row.id,
    databaseId: row.database_id,
    name: row.name,
    type: row.type,
    config: parseJson(row.config),
    sortOrder: row.sort_order,
  };
}

function mapView(row: ViewRow): DatabaseView {
  return {
    id: row.id,
    databaseId: row.database_id,
    name: row.name,
    type: row.type,
    config: parseJson(row.config),
    sortOrder: row.sort_order,
  };
}

export async function listDatabaseRecords(workspaceId: string) {
  const rows = await query<DbRow[]>(
    `SELECT * FROM tbl_databases
     WHERE workspace_id = :workspaceId AND deleted_at IS NULL
     ORDER BY updated_at DESC`,
    { workspaceId }
  );
  return rows.map(mapDatabase);
}

export async function findDatabaseRecord(databaseId: string, workspaceId: string) {
  const rows = await query<DbRow[]>(
    `SELECT * FROM tbl_databases
     WHERE id = :databaseId AND workspace_id = :workspaceId AND deleted_at IS NULL
     LIMIT 1`,
    { databaseId, workspaceId }
  );
  return rows[0] ? mapDatabase(rows[0]) : null;
}

export async function listProperties(databaseId: string) {
  const rows = await query<PropRow[]>(
    `SELECT * FROM tbl_database_properties
     WHERE database_id = :databaseId AND deleted_at IS NULL
     ORDER BY sort_order ASC`,
    { databaseId }
  );
  return rows.map(mapProperty);
}

export async function listViews(databaseId: string) {
  const rows = await query<ViewRow[]>(
    `SELECT * FROM tbl_database_views
     WHERE database_id = :databaseId AND deleted_at IS NULL
     ORDER BY sort_order ASC`,
    { databaseId }
  );
  return rows.map(mapView);
}

export async function listRowsWithCells(
  databaseId: string,
  workspaceId: string
): Promise<DatabaseRow[]> {
  const rows = await query<RowRow[]>(
    `SELECT * FROM tbl_database_rows
     WHERE database_id = :databaseId
       AND workspace_id = :workspaceId
       AND deleted_at IS NULL
     ORDER BY sort_order ASC`,
    { databaseId, workspaceId }
  );
  if (rows.length === 0) return [];

  const cells = await query<CellRow[]>(
    `SELECT c.row_id, c.property_id, c.value_json
     FROM tbl_database_cells c
     INNER JOIN tbl_database_rows r ON r.id = c.row_id
     WHERE r.database_id = :databaseId AND r.workspace_id = :workspaceId AND r.deleted_at IS NULL`,
    { databaseId, workspaceId }
  );

  const byRow = new Map<string, Record<string, unknown>>();
  for (const cell of cells) {
    const parsed = parseJson(cell.value_json);
    const value =
      parsed && "value" in parsed ? parsed.value : (parsed as unknown);
    const map = byRow.get(cell.row_id) ?? {};
    map[cell.property_id] = value;
    byRow.set(cell.row_id, map);
  }

  return rows.map((row) => ({
    id: row.id,
    databaseId: row.database_id,
    sortOrder: row.sort_order,
    cells: byRow.get(row.id) ?? {},
  }));
}

export async function createDatabaseWithDefaults(input: {
  workspaceId: string;
  name: string;
  description: string | null;
  createdBy: string;
}) {
  const databaseId = createId();
  const namePropId = createId();
  const statusPropId = createId();
  const tableViewId = createId();
  const boardViewId = createId();

  await withTransaction(async (conn) => {
    await conn.execute(
      `INSERT INTO tbl_databases
        (id, workspace_id, name, description, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [
        databaseId,
        input.workspaceId,
        input.name,
        input.description,
        input.createdBy,
      ]
    );
    await conn.execute(
      `INSERT INTO tbl_database_properties
        (id, workspace_id, database_id, name, type, config, sort_order)
       VALUES (?, ?, ?, 'Name', 'text', NULL, 'a0')`,
      [namePropId, input.workspaceId, databaseId]
    );
    await conn.execute(
      `INSERT INTO tbl_database_properties
        (id, workspace_id, database_id, name, type, config, sort_order)
       VALUES (?, ?, ?, 'Status', 'select', ?, 'a1')`,
      [
        statusPropId,
        input.workspaceId,
        databaseId,
        JSON.stringify({
          options: [
            { id: "todo", label: "To do", color: "gray" },
            { id: "doing", label: "Doing", color: "blue" },
            { id: "done", label: "Done", color: "green" },
          ],
        }),
      ]
    );
    await conn.execute(
      `INSERT INTO tbl_database_views
        (id, workspace_id, database_id, name, type, config, sort_order)
       VALUES (?, ?, ?, 'Table', 'table', NULL, 'a0')`,
      [tableViewId, input.workspaceId, databaseId]
    );
    await conn.execute(
      `INSERT INTO tbl_database_views
        (id, workspace_id, database_id, name, type, config, sort_order)
       VALUES (?, ?, ?, 'Board', 'board', ?, 'a1')`,
      [
        boardViewId,
        input.workspaceId,
        databaseId,
        JSON.stringify({ groupByPropertyId: statusPropId }),
      ]
    );
  });

  return databaseId;
}

export async function softDeleteDatabase(databaseId: string, workspaceId: string) {
  await execute(
    `UPDATE tbl_databases
     SET deleted_at = CURRENT_TIMESTAMP(3)
     WHERE id = :databaseId AND workspace_id = :workspaceId AND deleted_at IS NULL`,
    { databaseId, workspaceId }
  );
}

export async function createRowRecord(input: {
  workspaceId: string;
  databaseId: string;
  createdBy: string;
  sortOrder: string;
}) {
  const id = createId();
  await execute(
    `INSERT INTO tbl_database_rows
      (id, workspace_id, database_id, sort_order, created_by)
     VALUES (:id, :workspaceId, :databaseId, :sortOrder, :createdBy)`,
    { ...input, id }
  );
  return id;
}

export async function getMaxRowSortOrder(databaseId: string) {
  type Row = RowDataPacket & { sort_order: string | null };
  const rows = await query<Row[]>(
    `SELECT sort_order FROM tbl_database_rows
     WHERE database_id = :databaseId AND deleted_at IS NULL
     ORDER BY sort_order DESC LIMIT 1`,
    { databaseId }
  );
  return rows[0]?.sort_order ?? null;
}

export async function upsertCell(input: {
  workspaceId: string;
  rowId: string;
  propertyId: string;
  value: unknown;
}) {
  await execute(
    `INSERT INTO tbl_database_cells (id, workspace_id, row_id, property_id, value_json)
     VALUES (:id, :workspaceId, :rowId, :propertyId, :valueJson)
     ON DUPLICATE KEY UPDATE value_json = VALUES(value_json)`,
    {
      id: createId(),
      workspaceId: input.workspaceId,
      rowId: input.rowId,
      propertyId: input.propertyId,
      valueJson: JSON.stringify({ value: input.value }),
    }
  );
}

export async function softDeleteRow(rowId: string, workspaceId: string) {
  await execute(
    `UPDATE tbl_database_rows
     SET deleted_at = CURRENT_TIMESTAMP(3)
     WHERE id = :rowId AND workspace_id = :workspaceId AND deleted_at IS NULL`,
    { rowId, workspaceId }
  );
}

export async function findRow(rowId: string, databaseId: string, workspaceId: string) {
  const rows = await query<RowRow[]>(
    `SELECT * FROM tbl_database_rows
     WHERE id = :rowId AND database_id = :databaseId
       AND workspace_id = :workspaceId AND deleted_at IS NULL
     LIMIT 1`,
    { rowId, databaseId, workspaceId }
  );
  return rows[0] ?? null;
}
