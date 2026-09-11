"use client";

import { useState, useEffect } from "react";
import type { Editor } from "@tiptap/core";
import { Link2, ExternalLink, Unlink, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LinkPopover({
  editor,
  children,
}: {
  editor: Editor;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  const isLinkActive = editor.isActive("link");

  useEffect(() => {
    if (open) {
      const attrs = editor.getAttributes("link");
      setUrl(attrs.href || "");
    }
  }, [open, editor]);

  const handleApply = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const formatted =
        trimmed.startsWith("http://") ||
        trimmed.startsWith("https://") ||
        trimmed.startsWith("mailto:")
          ? trimmed
          : `https://${trimmed}`;
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: formatted })
        .run();
    }
    setOpen(false);
  };

  const handleUnlink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger nativeButton={false} render={<span className="inline-flex" />}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        align="center"
        side="bottom"
        sideOffset={6}
        className="w-80 rounded-lg p-2.5 shadow-raised"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Link2 className="size-3.5 text-muted-foreground shrink-0" />
            <Input
              type="url"
              placeholder="Paste or type a link..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApply();
                }
              }}
              className="h-8 text-xs"
              autoFocus
            />
            <Button
              type="button"
              size="icon-sm"
              variant="default"
              onClick={handleApply}
              title="Apply link"
            >
              <Check className="size-3.5" />
            </Button>
          </div>

          {isLinkActive && (
            <div className="flex items-center justify-between border-t pt-1.5 text-xs">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline truncate max-w-[180px]"
              >
                <ExternalLink className="size-3 shrink-0" />
                <span className="truncate">{url}</span>
              </a>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive px-2"
                onClick={handleUnlink}
              >
                <Unlink className="size-3 mr-1" />
                Remove
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
