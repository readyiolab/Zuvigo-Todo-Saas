"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-label text-foreground select-none",
        "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        // Inline controls read as body text, not as field labels
        "peer-data-[slot=checkbox]:text-body peer-data-[slot=checkbox]:font-normal",
        "peer-data-[slot=radio-group-item]:text-body peer-data-[slot=radio-group-item]:font-normal",
        "peer-data-[slot=switch]:text-body peer-data-[slot=switch]:font-normal",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
