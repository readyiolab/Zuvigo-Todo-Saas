"use client";

/**
 * DnD scaffolding hooks for Phase 3/4.
 * Uses @dnd-kit contracts without persisting until services are wired.
 */

export type SortableItem = {
  id: string;
  sortOrder: string;
};

export function applyLocalReorder<T extends SortableItem>(
  items: T[],
  activeId: string,
  overId: string
): T[] {
  const oldIndex = items.findIndex((i) => i.id === activeId);
  const newIndex = items.findIndex((i) => i.id === overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return items;

  const next = [...items];
  const [moved] = next.splice(oldIndex, 1);
  next.splice(newIndex, 0, moved);
  return next;
}
