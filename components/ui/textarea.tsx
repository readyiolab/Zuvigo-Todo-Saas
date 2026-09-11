import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content min-h-16 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-body shadow-subtle transition-[color,border-color] duration-(--duration-fast) outline-none",
        "placeholder:text-muted-foreground",
        "hover:border-border-strong",
        "focus-visible:border-ring focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
        "aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
