"use client";

import { isTaskIconImage } from "@/components/tasks/select-label";
import { cn } from "@/lib/utils";

export function TaskIconDisplay({
  icon,
  color,
  size = "sm",
  className,
}: {
  icon?: string | null;
  color?: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const dim = size === "md" ? "size-7 text-base" : "size-5 text-sm";
  const image = isTaskIconImage(icon);

  if (!icon && !color) return null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted/40",
        dim,
        className
      )}
      style={
        color
          ? { boxShadow: `inset 3px 0 0 0 ${color}`, borderColor: `${color}55` }
          : undefined
      }
      aria-hidden
    >
      {image && icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt="" className="size-full object-cover" />
      ) : icon ? (
        <span className="leading-none">{icon}</span>
      ) : color ? (
        <span
          className="size-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
    </span>
  );
}
