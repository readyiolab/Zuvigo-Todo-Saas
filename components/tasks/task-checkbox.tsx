"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function TaskCheckbox({
  checked,
  disabled,
  pending,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  pending?: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled || pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onCheckedChange(!checked);
      }}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          onCheckedChange(!checked);
        }
      }}
      className={cn(
        "inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1",
        "disabled:pointer-events-none disabled:opacity-50",
        checked
          ? "border-primary bg-primary text-primary-foreground scale-100"
          : "border-border-strong bg-background hover:border-primary/60 hover:bg-primary-soft/40",
        pending && "opacity-70"
      )}
    >
      <Check
        className={cn(
          "size-3 stroke-[2.5] transition-all duration-150",
          checked ? "scale-100 opacity-100" : "scale-50 opacity-0"
        )}
      />
    </button>
  );
}
