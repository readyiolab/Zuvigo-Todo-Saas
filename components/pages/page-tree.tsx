"use client";

import {
  useMemo,
  useOptimistic,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronRight,
  Copy,
  FileText,
  GripVertical,
  MoreHorizontal,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import type { PageTreeNode } from "@/modules/pages/page.types";
import {
  archivePageAction,
  createPageAction,
  duplicatePageAction,
  movePageAction,
  toggleFavoriteAction,
  updatePageTitleAction,
} from "@/modules/pages/page.actions";
import { sortOrderBetween } from "@/modules/editor/editor.types";
import { Input } from "@/components/ui/input";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function flatten(
  nodes: PageTreeNode[],
  depth = 0
): Array<PageTreeNode & { depth: number }> {
  const out: Array<PageTreeNode & { depth: number }> = [];
  for (const node of nodes) {
    out.push({ ...node, depth });
    out.push(...flatten(node.children, depth + 1));
  }
  return out;
}

const COLLAPSE_KEY = (workspaceId: string) =>
  `zuvigo:sidebar-collapsed:${workspaceId}`;

export function PageTree({
  workspaceId,
  workspaceSlug,
  pages,
  favoritesOnly = false,
}: {
  workspaceId: string;
  workspaceSlug: string;
  pages: PageTreeNode[];
  favoritesOnly?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(pages);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(COLLAPSE_KEY(workspaceId));
      if (raw) return JSON.parse(raw) as Record<string, boolean>;
    } catch {
      // ignore
    }
    return {};
  });
  const [renamingId, setRenamingId] = useState<string | null>(null);

  function persistCollapsed(next: Record<string, boolean>) {
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSE_KEY(workspaceId), JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  const flat = useMemo(() => {
    const filterCollapsed = (
      nodes: PageTreeNode[],
      depth = 0
    ): Array<PageTreeNode & { depth: number }> => {
      const out: Array<PageTreeNode & { depth: number }> = [];
      for (const node of nodes) {
        out.push({ ...node, depth });
        if (!collapsed[node.id]) {
          out.push(...filterCollapsed(node.children, depth + 1));
        }
      }
      return out;
    };
    const all = favoritesOnly
      ? flatten(optimistic).filter((p) => p.isFavorite)
      : filterCollapsed(optimistic);
    return all;
  }, [optimistic, favoritesOnly, collapsed]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function onCreate(parentId?: string | null) {
    startTransition(async () => {
      await createPageAction({
        workspaceId,
        workspaceSlug,
        parentId: parentId ?? null,
      });
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = flat.findIndex((p) => p.id === active.id);
    const newIndex = flat.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const moved = flat[oldIndex];
    const reordered = arrayMove(flat, oldIndex, newIndex);
    const before = reordered[newIndex - 1] ?? null;
    const after = reordered[newIndex + 1] ?? null;

    const parentId =
      after && after.parentId === (before?.parentId ?? after.parentId)
        ? after.parentId
        : (before?.parentId ?? moved.parentId);

    const siblings = reordered.filter(
      (p) => p.parentId === parentId && p.id !== moved.id
    );
    const siblingIndex = Math.max(
      0,
      siblings.findIndex((p) => p.id === (after?.id ?? before?.id))
    );
    const prevSibling = siblings[siblingIndex - 1] ?? before;
    const nextSibling = siblings[siblingIndex] ?? after;
    const sortOrder = sortOrderBetween(
      prevSibling && prevSibling.parentId === parentId
        ? prevSibling.sortOrder
        : null,
      nextSibling && nextSibling.parentId === parentId
        ? nextSibling.sortOrder
        : null
    );

    startTransition(async () => {
      setOptimistic((current) => structuredClone(current) as PageTreeNode[]);
      await movePageAction({
        workspaceId,
        workspaceSlug,
        pageId: String(active.id),
        parentId,
        sortOrder,
      });
      router.refresh();
    });
  }

  if (flat.length === 0 && !favoritesOnly) {
    return (
      <div className="px-2 py-1 text-[11px] text-muted-foreground/60">
        No pages inside
      </div>
    );
  }

  if (flat.length === 0 && favoritesOnly) {
    return (
      <p className="px-2 text-[11px] text-muted-foreground/60">
        Starred pages appear here
      </p>
    );
  }

  const rows = flat.map((page) => {
    const href = `/w/${workspaceSlug}/pages/${page.id}`;
    const active = pathname === href;
    const isCollapsed = Boolean(collapsed[page.id]);
    const hasChildren = Boolean(page.children && page.children.length > 0);

    const menuActions = {
      onRename: () => setRenamingId(page.id),
      onDuplicate: () => {
        startTransition(async () => {
          await duplicatePageAction({
            workspaceId,
            workspaceSlug,
            pageId: page.id,
          });
        });
      },
      onFavorite: () => {
        startTransition(async () => {
          await toggleFavoriteAction({
            workspaceId,
            workspaceSlug,
            pageId: page.id,
          });
          router.refresh();
        });
      },
      onAddChild: () => void onCreate(page.id),
      onDelete: () => {
        startTransition(async () => {
          const result = await archivePageAction({
            workspaceId,
            workspaceSlug,
            pageId: page.id,
          });
          if (!result.success) {
            toast.error(result.error.message);
            return;
          }
          toast.success("Moved to trash");
          router.refresh();
        });
      },
      onToggleCollapse: () => {
        persistCollapsed({
          ...collapsed,
          [page.id]: !collapsed[page.id],
        });
      },
    };

    if (favoritesOnly) {
      return (
        <PageRow
          key={page.id}
          page={page}
          href={href}
          active={active}
          showDragHandle={false}
          showAddChild={false}
          hasChildren={false}
          isCollapsed={false}
          renaming={renamingId === page.id}
          onRenameDone={(title) => {
            setRenamingId(null);
            if (!title.trim()) return;
            startTransition(async () => {
              await updatePageTitleAction({
                workspaceId,
                workspaceSlug,
                pageId: page.id,
                title,
              });
              router.refresh();
            });
          }}
          actions={menuActions}
          style={{
            paddingLeft: `calc(0.375rem + ${page.depth} * var(--tree-indent))`,
          }}
        />
      );
    }

    return (
      <SortablePageRow
        key={page.id}
        page={page}
        href={href}
        active={active}
        disabled={pending}
        hasChildren={hasChildren}
        isCollapsed={isCollapsed}
        renaming={renamingId === page.id}
        onRenameDone={(title) => {
          setRenamingId(null);
          if (!title.trim()) return;
          startTransition(async () => {
            await updatePageTitleAction({
              workspaceId,
              workspaceSlug,
              pageId: page.id,
              title,
            });
            router.refresh();
          });
        }}
        actions={menuActions}
      />
    );
  });

  return (
    <div className={cn("space-y-0.5", pending && "pointer-events-none opacity-70")}>
      {favoritesOnly ? (
        <ul className="space-y-0.5">{rows}</ul>
      ) : (
        <DndContext
          id={`sidebar-page-tree-${workspaceId}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={flat.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-0.5">{rows}</ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

type PageActions = {
  onRename: () => void;
  onDuplicate: () => void;
  onFavorite: () => void;
  onAddChild: () => void;
  onDelete: () => void;
  onToggleCollapse: () => void;
};

function PageRow({
  page,
  href,
  active,
  showDragHandle,
  showAddChild,
  hasChildren,
  isCollapsed,
  onAddChild,
  setNodeRef,
  style,
  isDragging,
  dragHandleProps,
  actions,
  renaming,
  onRenameDone,
}: {
  page: PageTreeNode & { depth: number };
  href: string;
  active: boolean;
  showDragHandle: boolean;
  showAddChild: boolean;
  hasChildren?: boolean;
  isCollapsed?: boolean;
  onAddChild?: () => void;
  setNodeRef?: (node: HTMLElement | null) => void;
  style?: CSSProperties;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
  actions: PageActions;
  renaming?: boolean;
  onRenameDone?: (title: string) => void;
}) {
  return (
    <ContextMenu>
      <li
        ref={setNodeRef}
        style={style}
        className={cn(
          "group flex h-7 items-center rounded-md px-1 text-[13px] transition-colors",
          active
            ? "bg-sidebar-accent font-medium text-sidebar-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
          isDragging && "opacity-50"
        )}
      >
        <ContextMenuTrigger className="flex min-w-0 flex-1 items-center gap-1">
          {/* Expand / Collapse Chevron */}
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                actions.onToggleCollapse();
              }}
              className="flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground/60 hover:text-sidebar-foreground"
              aria-label={isCollapsed ? "Expand page" : "Collapse page"}
            >
              <ChevronRight
                className={cn(
                  "size-3 transition-transform duration-150",
                  !isCollapsed && "rotate-90"
                )}
              />
            </button>
          ) : (
            <span className="size-4 shrink-0" />
          )}

          {/* Drag handle */}
          {showDragHandle ? (
            <button
              type="button"
              className="hidden size-3.5 shrink-0 cursor-grab items-center justify-center text-muted-foreground/40 hover:text-sidebar-foreground group-hover:flex"
              aria-label="Drag page"
              {...dragHandleProps}
            >
              <GripVertical className="size-3" />
            </button>
          ) : null}

          {/* Title or Inline Rename */}
          {renaming ? (
            <Input
              autoFocus
              defaultValue={page.title}
              className="h-6 flex-1 px-1 text-xs"
              onBlur={(e) => onRenameDone?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onRenameDone?.((e.target as HTMLInputElement).value);
                }
                if (e.key === "Escape") onRenameDone?.(page.title);
              }}
            />
          ) : (
            <Link
              href={href}
              className="flex min-w-0 flex-1 items-center gap-1.5 truncate"
            >
              {page.isFavorite ? (
                <Star className="size-3.5 shrink-0 fill-warning text-warning" />
              ) : page.icon ? (
                <span className="shrink-0 text-xs">{page.icon}</span>
              ) : (
                <FileText className="size-3.5 shrink-0 text-muted-foreground/70" />
              )}
              <span className="truncate">{page.title || "Untitled"}</span>
            </Link>
          )}

          {/* Right Hover Actions (More & Add Subpage) */}
          <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-sidebar-border hover:text-sidebar-foreground"
                    aria-label="Page actions"
                  />
                }
              >
                <MoreHorizontal className="size-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 text-xs">
                <DropdownMenuItem onClick={actions.onRename}>Rename</DropdownMenuItem>
                <DropdownMenuItem onClick={actions.onDuplicate}>
                  <Copy className="mr-2 size-3.5" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={actions.onFavorite}>
                  <Star className="mr-2 size-3.5" />
                  {page.isFavorite ? "Unfavorite" : "Favorite"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={actions.onAddChild}>
                  <Plus className="mr-2 size-3.5" />
                  Add subpage
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={actions.onDelete}>
                  <Trash2 className="mr-2 size-3.5" />
                  Move to trash
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {showAddChild && onAddChild ? (
              <button
                type="button"
                className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-sidebar-border hover:text-sidebar-foreground"
                aria-label="Add subpage"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddChild();
                }}
              >
                <Plus className="size-3" />
              </button>
            ) : null}
          </div>
        </ContextMenuTrigger>
      </li>
      <ContextMenuContent className="w-44 text-xs">
        <ContextMenuItem onClick={actions.onRename}>Rename</ContextMenuItem>
        <ContextMenuItem onClick={actions.onDuplicate}>
          <Copy className="mr-2 size-3.5" />
          Duplicate
        </ContextMenuItem>
        <ContextMenuItem onClick={actions.onFavorite}>
          <Star className="mr-2 size-3.5" />
          {page.isFavorite ? "Unfavorite" : "Favorite"}
        </ContextMenuItem>
        <ContextMenuItem onClick={actions.onAddChild}>
          <Plus className="mr-2 size-3.5" />
          Add subpage
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={actions.onDelete}>
          <Trash2 className="mr-2 size-3.5" />
          Move to trash
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function SortablePageRow({
  page,
  href,
  active,
  disabled,
  hasChildren,
  isCollapsed,
  actions,
  renaming,
  onRenameDone,
}: {
  page: PageTreeNode & { depth: number };
  href: string;
  active: boolean;
  disabled?: boolean;
  hasChildren?: boolean;
  isCollapsed?: boolean;
  actions: PageActions;
  renaming?: boolean;
  onRenameDone?: (title: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    paddingLeft: `calc(0.375rem + ${page.depth} * var(--tree-indent))`,
  };

  return (
    <PageRow
      page={page}
      href={href}
      active={active}
      showDragHandle={!disabled}
      showAddChild={!disabled}
      hasChildren={hasChildren}
      isCollapsed={isCollapsed}
      onAddChild={actions.onAddChild}
      setNodeRef={setNodeRef}
      style={style}
      isDragging={isDragging}
      dragHandleProps={{ ...attributes, ...listeners }}
      actions={actions}
      renaming={renaming}
      onRenameDone={onRenameDone}
    />
  );
}
