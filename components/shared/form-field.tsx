import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function FormField({
  label,
  description,
  error,
  children,
  className,
}: {
  label?: ReactNode
  description?: ReactNode
  error?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {label ? <label className="text-body font-medium">{label}</label> : null}
      {children}
      {error ? (
        <p className="text-caption text-destructive">{error}</p>
      ) : description ? (
        <p className="text-caption text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

