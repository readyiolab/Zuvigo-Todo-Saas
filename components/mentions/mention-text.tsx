"use client";

import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { splitMentionSegments, type CommentMention } from "@/lib/mention-helpers";
import { cn } from "@/lib/utils";

export function MentionText({
  body,
  mentions = [],
  workspaceSlug,
  className,
}: {
  body: string;
  mentions?: CommentMention[];
  workspaceSlug: string;
  className?: string;
}) {
  const segments = splitMentionSegments(body, mentions);

  return (
    <p className={cn("whitespace-pre-wrap", className)}>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return <span key={i}>{seg.value}</span>;
        }
        const m = seg.mention;
        if (m.type === "page") {
          return (
            <Link
              key={i}
              href={`/w/${workspaceSlug}/pages/${m.id}`}
              className="rounded-sm bg-primary/10 px-1 py-0.5 font-medium text-primary hover:bg-primary/15"
            >
              @{m.label}
            </Link>
          );
        }
        if (m.type === "date") {
          return (
            <Tooltip key={i}>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="rounded-sm bg-muted px-1 py-0.5 font-medium text-foreground"
                  />
                }
              >
                @{m.label}
              </TooltipTrigger>
              <TooltipContent>{m.id}</TooltipContent>
            </Tooltip>
          );
        }
        return (
          <Tooltip key={i}>
            <TooltipTrigger
              render={
                <span className="rounded-sm bg-primary/10 px-1 py-0.5 font-medium text-primary" />
              }
            >
              @{m.label}
            </TooltipTrigger>
            <TooltipContent>Person</TooltipContent>
          </Tooltip>
        );
      })}
    </p>
  );
}
