export type ProjectStatus =
  | "planned"
  | "active"
  | "on_hold"
  | "completed"
  | "archived";

export type ProjectRecord = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  dueDate: string | null;
  createdBy: string;
  sortOrder: string;
  updatedAt: Date;
};
