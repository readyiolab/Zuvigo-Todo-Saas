import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border-0 bg-transparent px-2 py-0.5 text-label font-medium whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 has-data-[icon=inline-end]:pr-0 has-data-[icon=inline-start]:pl-0 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "text-foreground [a]:hover:text-foreground/70",
        secondary: "text-muted-foreground [a]:hover:text-foreground",
        destructive:
          "text-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:text-destructive/70",
        outline: "text-foreground [a]:hover:text-foreground/70",
        ghost: "text-muted-foreground hover:text-foreground",
        link: "text-foreground underline-offset-4 hover:underline",
        soft: "rounded-md bg-muted px-2 py-0.5 text-muted-foreground",
        info: "rounded-md bg-info-soft px-2 py-0.5 text-info",
        success: "rounded-md bg-success-soft px-2 py-0.5 text-success",
        warning:
          "rounded-md bg-warning-soft px-2 py-0.5 text-warning-foreground dark:text-warning",
        danger: "rounded-md bg-destructive-soft px-2 py-0.5 text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
