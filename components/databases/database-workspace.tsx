"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type {
  DatabaseProperty,
  DatabaseRow,
  DatabaseView,
} from "@/modules/databases/database.types";
import {
  createDatabaseRowAction,
  deleteDatabaseRowAction,
  updateDatabaseCellAction,
} from "@/modules/databases/database.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

function CellEditor({
  property,
  value,
  onChange,
}: {
  property: DatabaseProperty;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (property.type === "checkbox") {
    return (
      <Checkbox
        checked={Boolean(value)}
        onCheckedChange={(checked) => onChange(Boolean(checked))}
      />
    );
  }

  if (property.type === "select") {
    const options =
      (property.config?.options as Array<{ id: string; label: string }>) ?? [];
    return (
      <Select
        value={typeof value === "string" ? value : ""}
        onValueChange={onChange}
      >
        <SelectTrigger className="h-8 border-0 shadow-none">
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.id} value={opt.id}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (property.type === "number") {
    return (
      <Input
        type="number"
        className="h-8 border-0 shadow-none"
        defaultValue={value == null ? "" : String(value)}
        onBlur={(e) => {
          const n = e.target.value === "" ? null : Number(e.target.value);
          onChange(Number.isFinite(n as number) ? n : null);
        }}
      />
    );
  }

  return (
    <Input
      className="h-8 border-0 shadow-none"
      defaultValue={value == null ? "" : String(value)}
      onBlur={(e) => onChange(e.target.value)}
    />
  );
}

export function DatabaseWorkspace({
  workspaceId,
  workspaceSlug,
  databaseId,
  properties,
  views,
  rows,
}: {
  workspaceId: string;
  workspaceSlug: string;
  databaseId: string;
  properties: DatabaseProperty[];
  views: DatabaseView[];
  rows: DatabaseRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [localRows, setLocalRows] = useState(rows);
  const selectProp = useMemo(
    () => properties.find((p) => p.type === "select") ?? null,
    [properties]
  );

  function saveCell(rowId: string, propertyId: string, value: unknown) {
    setLocalRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? { ...row, cells: { ...row.cells, [propertyId]: value } }
          : row
      )
    );
    startTransition(async () => {
      const result = await updateDatabaseCellAction({
        workspaceId,
        workspaceSlug,
        databaseId,
        rowId,
        propertyId,
        value,
      });
      if (!result.success) toast.error(result.error.message);
    });
  }

  const boardColumns = useMemo(() => {
    if (!selectProp) return [];
    const options =
      (selectProp.config?.options as Array<{ id: string; label: string }>) ??
      [];
    return [
      ...options,
      { id: "__empty", label: "No status" },
    ].map((opt) => ({
      ...opt,
      rows: localRows.filter((row) => {
        const v = row.cells[selectProp.id];
        if (opt.id === "__empty") return !v;
        return v === opt.id;
      }),
    }));
  }, [localRows, selectProp]);

  return (
    <Tabs defaultValue="table" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="board">Board</TabsTrigger>
        </TabsList>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await createDatabaseRowAction({
                workspaceId,
                workspaceSlug,
                databaseId,
              });
              if (!result.success) {
                toast.error(result.error.message);
                return;
              }
              router.refresh();
            });
          }}
        >
          <Plus className="size-3.5" />
          New row
        </Button>
      </div>

      <TabsContent value="table" className="space-y-2">
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[640px] text-left text-body">
            <thead className="border-b bg-muted/40 text-caption text-muted-foreground">
              <tr>
                {properties.map((prop) => (
                  <th key={prop.id} className="px-3 py-2 font-medium">
                    {prop.name}
                  </th>
                ))}
                <th className="w-12 px-2" />
              </tr>
            </thead>
            <tbody>
              {localRows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  {properties.map((prop) => (
                    <td key={prop.id} className="px-1 py-1 align-middle">
                      <CellEditor
                        property={prop}
                        value={row.cells[prop.id]}
                        onChange={(value) => saveCell(row.id, prop.id, value)}
                      />
                    </td>
                  ))}
                  <td className="px-1">
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label="Delete row"
                      onClick={() => {
                        startTransition(async () => {
                          const result = await deleteDatabaseRowAction({
                            workspaceId,
                            workspaceSlug,
                            databaseId,
                            rowId: row.id,
                          });
                          if (!result.success) {
                            toast.error(result.error.message);
                            return;
                          }
                          setLocalRows((prev) =>
                            prev.filter((r) => r.id !== row.id)
                          );
                        });
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {localRows.length === 0 ? (
            <p className="px-4 py-8 text-center text-caption text-muted-foreground">
              No rows yet. Add one to get started.
            </p>
          ) : null}
        </div>
        {views.length ? (
          <p className="text-caption text-muted-foreground">
            Views: {views.map((v) => v.name).join(" · ")}
          </p>
        ) : null}
      </TabsContent>

      <TabsContent value="board">
        {!selectProp ? (
          <p className="text-caption text-muted-foreground">
            Add a select property to use the board view.
          </p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {boardColumns.map((col) => (
              <div
                key={col.id}
                className="w-64 shrink-0 rounded-lg border border-border bg-card p-3"
              >
                <p className="mb-2 text-caption font-medium text-muted-foreground">
                  {col.label}
                </p>
                <ul className="space-y-2">
                  {col.rows.map((row) => {
                    const titleProp = properties.find((p) => p.type === "text");
                    const title = titleProp
                      ? String(row.cells[titleProp.id] ?? "Untitled")
                      : "Untitled";
                    return (
                      <li
                        key={row.id}
                        className="rounded-md border border-border bg-background px-3 py-2 text-body"
                      >
                        {title || "Untitled"}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
