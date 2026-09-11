"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/shared/empty-state"
import { cn } from "@/lib/utils"

export type DataTableColumn<T> = {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  /** Plain text used for client search (required for searchable JSX cells). */
  searchValue?: (row: T) => string
  className?: string
  headerClassName?: string
}

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  getRowHref,
  searchPlaceholder = "Search…",
  emptyState,
  className,
}: {
  rows: T[]
  columns: DataTableColumn<T>[]
  getRowId?: (row: T) => string
  getRowHref?: (row: T) => string | undefined
  searchPlaceholder?: string
  emptyState?: ReactNode
  className?: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    if (!query.trim()) return rows
    const q = query.toLowerCase()

    return rows.filter((row) => {
      const text = columns
        .map((c) => {
          if (c.searchValue) return c.searchValue(row)
          const v = c.cell(row)
          return typeof v === "string" || typeof v === "number" ? String(v) : ""
        })
        .join(" ")
        .toLowerCase()
      return text.includes(q)
    })
  }, [columns, query, rows])

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="h-9 pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        emptyState ?? (
          <EmptyState
            title="No results"
            description="Try a different search."
          />
        )
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/80">
          <Table>
            <TableHeader className="sticky top-0 z-(--z-toolbar) bg-muted/40 backdrop-blur-sm">
              <TableRow className="hover:bg-transparent">
                {columns.map((c) => (
                  <TableHead
                    key={c.key}
                    className={cn(
                      "h-9 px-2.5 text-left text-caption font-medium text-muted-foreground",
                      c.headerClassName
                    )}
                  >
                    {c.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((row) => {
                const href = getRowHref?.(row)
                const id = getRowId?.(row)
                return (
                  <TableRow
                    key={id ?? JSON.stringify(row)}
                    className={cn(
                      "h-(--row-h) border-border/60 transition-colors duration-(--duration-fast) hover:bg-muted/40",
                      href && "cursor-pointer"
                    )}
                    onClick={
                      href
                        ? () => {
                            router.push(href)
                          }
                        : undefined
                    }
                  >
                    {columns.map((c) => (
                      <TableCell
                        key={c.key}
                        className={cn("px-2.5 py-1.5", c.className)}
                      >
                        {href && c.key === columns[0]?.key ? (
                          <Link
                            href={href}
                            className="font-medium hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {c.cell(row)}
                          </Link>
                        ) : (
                          c.cell(row)
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
