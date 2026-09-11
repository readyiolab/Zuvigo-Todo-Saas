import type { ReactNode } from "react"
import Link from "next/link"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { cn } from "@/lib/utils"

export type BreadcrumbItemInput = {
  label: string
  href?: string
}

export function PageHeader({
  breadcrumbs,
  title,
  description,
  actions,
  toolbar,
  tabs,
  className,
  titleClassName,
}: {
  breadcrumbs?: BreadcrumbItemInput[]
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  toolbar?: ReactNode
  tabs?: ReactNode
  className?: string
  titleClassName?: string
}) {
  const breadcrumbItems = breadcrumbs ?? []

  return (
    <header className={cn("space-y-4", className)}>
      {breadcrumbItems.length > 0 ? (
        <Breadcrumb>
          <BreadcrumbList className="text-caption text-muted-foreground">
            {breadcrumbItems.map((b, idx) => {
              const last = idx === breadcrumbItems.length - 1
              return (
                <BreadcrumbItem key={`${b.label}-${idx}`}>
                  {b.href && !last ? (
                    <BreadcrumbLink render={<Link href={b.href} />}>
                      {b.label}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{b.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1
            className={cn(
              "text-title tracking-tight text-foreground",
              titleClassName
            )}
          >
            {title}
          </h1>
          {description ? (
            <div className="text-caption text-muted-foreground">
              {description}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>

      {tabs ? <div>{tabs}</div> : null}
      {toolbar ? <div>{toolbar}</div> : null}
    </header>
  )
}
