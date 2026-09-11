"use client";

import { useCallback } from "react";
import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/core";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Highlighter,
  Link2,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Type,
  List,
  ListOrdered,
  CheckSquare,
  AlertCircle,
  Code2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LinkPopover } from "@/components/editor/components/link-popover";
import { cn } from "@/lib/utils";

function shouldShowBubbleMenu({
  editor,
  from,
  to,
}: {
  editor: Editor;
  from: number;
  to: number;
}) {
  if (from === to) return false;
  if (editor.isActive("image")) return false;
  return true;
}

const BUBBLE_MENU_OPTIONS = {
  placement: "top" as const,
  offset: 8,
};

export function EditorBubbleMenu({ editor }: { editor: Editor }) {
  const shouldShow = useCallback(shouldShowBubbleMenu, []);

  return (
    <BubbleMenu
      editor={editor}
      options={BUBBLE_MENU_OPTIONS}
      shouldShow={shouldShow}
      className="flex items-center gap-0.5 rounded-lg border bg-popover/95 p-1 text-popover-foreground shadow-overlay backdrop-blur animate-in fade-in-50 zoom-in-95"
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-1.5 text-xs font-medium"
            />
          }
        >
          {editor.isActive("heading", { level: 1 }) ? (
            <Heading1 className="size-3.5" />
          ) : editor.isActive("heading", { level: 2 }) ? (
            <Heading2 className="size-3.5" />
          ) : editor.isActive("heading", { level: 3 }) ? (
            <Heading3 className="size-3.5" />
          ) : editor.isActive("bulletList") ? (
            <List className="size-3.5" />
          ) : editor.isActive("orderedList") ? (
            <ListOrdered className="size-3.5" />
          ) : editor.isActive("taskList") ? (
            <CheckSquare className="size-3.5" />
          ) : editor.isActive("blockquote") ? (
            <Quote className="size-3.5" />
          ) : editor.isActive("callout") ? (
            <AlertCircle className="size-3.5" />
          ) : editor.isActive("codeBlock") ? (
            <Code2 className="size-3.5" />
          ) : (
            <Type className="size-3.5" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40 text-xs">
          <DropdownMenuItem
            onClick={() => editor.chain().focus().setParagraph().run()}
          >
            <Type className="mr-1 size-3.5" />
            Paragraph
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <Heading1 className="mr-1 size-3.5" />
            Heading 1
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 className="mr-1 size-3.5" />
            Heading 2
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            <Heading3 className="mr-1 size-3.5" />
            Heading 3
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="mr-1 size-3.5" />
            Bullet list
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="mr-1 size-3.5" />
            Numbered list
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            <CheckSquare className="mr-1 size-3.5" />
            To-do list
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="mr-1 size-3.5" />
            Quote
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().toggleCallout().run()}
          >
            <AlertCircle className="mr-1 size-3.5" />
            Callout
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <Code2 className="mr-1 size-3.5" />
            Code block
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="mx-0.5 h-4" />

      <BubbleButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-3.5" />
      </BubbleButton>
      <BubbleButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-3.5" />
      </BubbleButton>
      <BubbleButton
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="size-3.5" />
      </BubbleButton>
      <BubbleButton
        label="Strike"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="size-3.5" />
      </BubbleButton>
      <BubbleButton
        label="Code"
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code className="size-3.5" />
      </BubbleButton>
      <BubbleButton
        label="Highlight"
        active={editor.isActive("highlight")}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlighter className="size-3.5" />
      </BubbleButton>

      <Separator orientation="vertical" className="mx-0.5 h-4" />

      <LinkPopover editor={editor}>
        <BubbleButton label="Link" active={editor.isActive("link")} onClick={() => {}}>
          <Link2
            className={cn("size-3.5", editor.isActive("link") && "text-primary")}
          />
        </BubbleButton>
      </LinkPopover>
    </BubbleMenu>
  );
}

function BubbleButton({
  children,
  onClick,
  active,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  label: string;
}) {
  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      aria-label={label}
      title={label}
      className={cn("h-7 w-7", active && "bg-muted text-primary")}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
