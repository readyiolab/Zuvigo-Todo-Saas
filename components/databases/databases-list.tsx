"use client";

import Link from "next/link";
import { Database } from "lucide-react";
import type { DatabaseRecord } from "@/modules/databases/database.types";
import { EmptyState } from "@/components/shared/empty-state";
import { CreateDatabaseButton } from "@/components/databases/create-database-button";

export function DatabasesList({
  workspaceId,
  workspaceSlug,
  databases,
}: {
  workspaceId: string;
  workspaceSlug: string;
  databases: DatabaseRecord[];
}) {
  if (databases.length === 0) {
    return (
      <EmptyState
        icon={Database}
        title="Create your first database"
        description="Track anything with properties, rows, and table or board views."
        action={
          <CreateDatabaseButton
            workspaceId={workspaceId}
            workspaceSlug={workspaceSlug}
          />
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {databases.map((db) => (
        <li key={db.id}>
          <Link
            href={`/w/${workspaceSlug}/databases/${db.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
          >
            <Database className="size-4 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-body font-medium">{db.name}</p>
              {db.description ? (
                <p className="truncate text-caption text-muted-foreground">
                  {db.description}
                </p>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
