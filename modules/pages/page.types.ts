export type PageRecord = {
  id: string;
  workspaceId: string;
  parentId: string | null;
  title: string;
  icon: string | null;
  coverFileId: string | null;
  sortOrder: string;
  isArchived: boolean;
  createdBy: string;
  updatedAt: Date;
};

export type PageTreeNode = PageRecord & {
  children: PageTreeNode[];
  isFavorite: boolean;
};
