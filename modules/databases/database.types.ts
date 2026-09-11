export type DatabasePropertyType =
  | "text"
  | "number"
  | "select"
  | "multi_select"
  | "checkbox"
  | "date"
  | "person"
  | "url";

export type DatabaseRecord = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  createdBy: string;
  updatedAt: Date;
};

export type DatabaseProperty = {
  id: string;
  databaseId: string;
  name: string;
  type: DatabasePropertyType;
  config: Record<string, unknown> | null;
  sortOrder: string;
};

export type DatabaseView = {
  id: string;
  databaseId: string;
  name: string;
  type: "table" | "board" | "list" | "calendar";
  config: Record<string, unknown> | null;
  sortOrder: string;
};

export type DatabaseCell = {
  propertyId: string;
  value: unknown;
};

export type DatabaseRow = {
  id: string;
  databaseId: string;
  sortOrder: string;
  cells: Record<string, unknown>;
};

export type DatabaseDetail = {
  database: DatabaseRecord;
  properties: DatabaseProperty[];
  views: DatabaseView[];
  rows: DatabaseRow[];
};
