"use client";

import type { Editor } from "@tiptap/core";
import {
  Table as TableIcon,
  Plus,
  Trash2,
  Split,
  Columns,
  Rows,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface TableCommandsChain {
  insertTable: (options: { rows: number; cols: number; withHeaderRow: boolean }) => TableCommandsChain;
  addColumnBefore: () => TableCommandsChain;
  addColumnAfter: () => TableCommandsChain;
  deleteColumn: () => TableCommandsChain;
  addRowBefore: () => TableCommandsChain;
  addRowAfter: () => TableCommandsChain;
  deleteRow: () => TableCommandsChain;
  toggleHeaderRow: () => TableCommandsChain;
  toggleHeaderColumn: () => TableCommandsChain;
  mergeOrSplit: () => TableCommandsChain;
  deleteTable: () => TableCommandsChain;
  run: () => boolean;
}

function getTableChain(editor: Editor): TableCommandsChain {
  return editor.chain().focus() as unknown as TableCommandsChain;
}

export function TableMenuDropdown({ editor }: { editor: Editor }) {
  const isTableActive = editor.isActive("table");

  if (!isTableActive) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 gap-1 px-2 text-xs"
        onClick={() => {
          getTableChain(editor)
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run();
        }}
        title="Insert 3x3 Table"
      >
        <TableIcon className="size-3.5" />
        <span className="hidden sm:inline">Table</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 gap-1 bg-muted/70 px-2 text-xs font-medium"
          />
        }
      >
        <TableIcon className="size-3.5 text-primary" />
        Table
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 text-xs">
        <div className="px-2 py-1 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
          Columns
        </div>
        <DropdownMenuItem
          onClick={() => getTableChain(editor).addColumnBefore().run()}
        >
          <Plus className="size-3.5 mr-1 text-muted-foreground" />
          Add column before
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => getTableChain(editor).addColumnAfter().run()}
        >
          <Plus className="size-3.5 mr-1 text-muted-foreground" />
          Add column after
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => getTableChain(editor).deleteColumn().run()}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <Columns className="size-3.5 mr-1" />
          Delete column
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <div className="px-2 py-1 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
          Rows
        </div>
        <DropdownMenuItem
          onClick={() => getTableChain(editor).addRowBefore().run()}
        >
          <Plus className="size-3.5 mr-1 text-muted-foreground" />
          Add row before
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => getTableChain(editor).addRowAfter().run()}
        >
          <Plus className="size-3.5 mr-1 text-muted-foreground" />
          Add row after
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => getTableChain(editor).deleteRow().run()}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <Rows className="size-3.5 mr-1" />
          Delete row
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <div className="px-2 py-1 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
          Cells & Headers
        </div>
        <DropdownMenuItem
          onClick={() => getTableChain(editor).toggleHeaderRow().run()}
        >
          Toggle header row
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => getTableChain(editor).toggleHeaderColumn().run()}
        >
          Toggle header column
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => getTableChain(editor).mergeOrSplit().run()}
        >
          <Split className="size-3.5 mr-1 text-muted-foreground" />
          Merge / Split cells
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => getTableChain(editor).deleteTable().run()}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive font-medium"
        >
          <Trash2 className="size-3.5 mr-1" />
          Delete table
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
