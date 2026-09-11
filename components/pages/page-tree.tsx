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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
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
      <div className="space-y-2 px-2">
        <p className="text-caption text-muted-foreground">No pages yet</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full justify-start"
          disabled={pending}
          onClick={() => void onCreate(null)}
        >
          {pending ? (
            <Spinner className="size-3.5" />
          ) : (
            <Plus className="size-3.5" />
          )}
          New page
        </Button>
      </div>
    );
  }

  if (flat.length === 0 && favoritesOnly) {
    return (
      <p className="px-2 text-caption text-muted-foreground">
        Pages you favorite will appear here
      </p>
    );
  }

  const rows = flat.map((page) => {
    const href = `/w/${workspaceSlug}/pages/${page.id}`;
    const active = pathname === href;

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
            paddingLeft: `calc(0.5rem + ${page.depth} * var(--tree-indent))`,
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
    <div
      className={cn("space-y-1", pending && "pointer-events-none opacity-70")}
    >
      {!favoritesOnly ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="w-full justify-start px-2"
          disabled={pending}
          onClick={() => void onCreate(null)}
        >
          {pending ? (
            <Spinner className="size-3.5" />
          ) : (
            <Plus className="size-3.5" />
          )}
          New page
        </Button>
      ) : null}

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
          "group flex items-center gap-0.5 rounded-md pr-1 text-body",
          active && "bg-sidebar-accent font-medium",
          isDragging && "opacity-60"
        )}
      >
        <ContextMenuTrigger className="flex min-w-0 flex-1 items-center gap-0.5">
        {showDragHandle ? (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="cursor-grab touch-none opacity-0 group-hover:opacity-100"
            aria-label="Drag page"
            {...dragHandleProps}
          >
            <GripVertical className="size-3.5" />
          </Button>
        ) : (
          <span className="size-7 shrink-0" />
        )}
        {renaming ? (
          <Input
            autoFocus
            defaultValue={page.title}
            className="h-7 flex-1"
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
            className="flex min-w-0 flex-1 items-center gap-1.5 truncate py-1.5"
          >
            {page.isFavorite ? (
              <Star className="size-3.5 shrink-0 fill-warning text-warning" />
            ) : (
              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate">
              {page.icon ? `${page.icon} ` : ""}
              {page.title}
            </span>
          </Link>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100"
                aria-label="Page actions"
              />
            }
          >
            <MoreHorizontal className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={actions.onRename}>Rename</DropdownMenuItem>
            <DropdownMenuItem onClick={actions.onDuplicate}>
              <Copy className="size-3.5" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={actions.onFavorite}>
              <Star className="size-3.5" />
              {page.isFavorite ? "Unfavorite" : "Favorite"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={actions.onAddChild}>
              <Plus className="size-3.5" />
              Add subpage
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={actions.onDelete}>
              <Trash2 className="size-3.5" />
              Move to trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {showAddChild && onAddChild ? (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="opacity-0 group-hover:opacity-100"
            aria-label="Add subpage"
            onClick={onAddChild}
          >
            <Plus className="size-3.5" />
          </Button>
        ) : null}
        </ContextMenuTrigger>
      </li>
      <ContextMenuContent className="w-44">
        <ContextMenuItem onClick={actions.onRename}>Rename</ContextMenuItem>
        <ContextMenuItem onClick={actions.onDuplicate}>Duplicate</ContextMenuItem>
        <ContextMenuItem onClick={actions.onFavorite}>
          {page.isFavorite ? "Unfavorite" : "Favorite"}
        </ContextMenuItem>
        <ContextMenuItem onClick={actions.onAddChild}>Add subpage</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={actions.onDelete}>
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
  actions,
  renaming,
  onRenameDone,
}: {
  page: PageTreeNode & { depth: number };
  href: string;
  active: boolean;
  disabled?: boolean;
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
    paddingLeft: `calc(0.5rem + ${page.depth} * var(--tree-indent))`,
  };

  return (
    <PageRow
      page={page}
      href={href}
      active={active}
      showDragHandle={!disabled}
      showAddChild={!disabled}
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
