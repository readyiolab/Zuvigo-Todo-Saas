"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Highlighter,
  List,
  ListOrdered,
  Quote,
  Code2,
  Minus,
  CheckSquare,
  ImageIcon,
  Type,
  Undo2,
  Redo2,
  AlertCircle,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableMenuDropdown } from "@/components/editor/components/table-menu";
import { LinkPopover } from "@/components/editor/components/link-popover";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";

function getBlockLabel(editor: Editor) {
  if (editor.isActive("heading", { level: 1 })) return "Heading 1";
  if (editor.isActive("heading", { level: 2 })) return "Heading 2";
  if (editor.isActive("heading", { level: 3 })) return "Heading 3";
  if (editor.isActive("bulletList")) return "Bullet list";
  if (editor.isActive("orderedList")) return "Numbered list";
  if (editor.isActive("taskList")) return "To-do list";
  if (editor.isActive("blockquote")) return "Quote";
  if (editor.isActive("callout")) return "Callout";
  if (editor.isActive("codeBlock")) return "Code block";
  return "Paragraph";
}

type ToolbarEditorState = {
  blockLabel: string;
  h1: boolean;
  h2: boolean;
  h3: boolean;
  bullet: boolean;
  ordered: boolean;
  task: boolean;
  quote: boolean;
  callout: boolean;
  codeBlock: boolean;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  highlight: boolean;
  link: boolean;
  canUndo: boolean;
  canRedo: boolean;
};

export function EditorToolbar({
  editor,
  isUploading,
  pending,
  saveState,
  stats,
  onUploadClick,
  onRetrySave,
}: {
  editor: Editor;
  isUploading: boolean;
  pending: boolean;
  saveState: SaveState;
  stats: { words: number; characters: number };
  onUploadClick: () => void;
  onRetrySave?: () => void;
}) {
  const active = useEditorState({
    editor,
    equalityFn: (a: ToolbarEditorState | null, b: ToolbarEditorState | null) => {
      if (a === b) return true;
      if (!a || !b) return false;
      return (
        a.blockLabel === b.blockLabel &&
        a.h1 === b.h1 &&
        a.h2 === b.h2 &&
        a.h3 === b.h3 &&
        a.bullet === b.bullet &&
        a.ordered === b.ordered &&
        a.task === b.task &&
        a.quote === b.quote &&
        a.callout === b.callout &&
        a.codeBlock === b.codeBlock &&
        a.bold === b.bold &&
        a.italic === b.italic &&
        a.underline === b.underline &&
        a.strike === b.strike &&
        a.code === b.code &&
        a.highlight === b.highlight &&
        a.link === b.link &&
        a.canUndo === b.canUndo &&
        a.canRedo === b.canRedo
      );
    },
    selector: ({ editor: ed }): ToolbarEditorState => {
      if (!ed) {
        return {
          blockLabel: "Paragraph",
          h1: false,
          h2: false,
          h3: false,
          bullet: false,
          ordered: false,
          task: false,
          quote: false,
          callout: false,
          codeBlock: false,
          bold: false,
          italic: false,
          underline: false,
          strike: false,
          code: false,
          highlight: false,
          link: false,
          canUndo: false,
          canRedo: false,
        };
      }
      return {
        blockLabel: getBlockLabel(ed),
        h1: ed.isActive("heading", { level: 1 }),
        h2: ed.isActive("heading", { level: 2 }),
        h3: ed.isActive("heading", { level: 3 }),
        bullet: ed.isActive("bulletList"),
        ordered: ed.isActive("orderedList"),
        task: ed.isActive("taskList"),
        quote: ed.isActive("blockquote"),
        callout: ed.isActive("callout"),
        codeBlock: ed.isActive("codeBlock"),
        bold: ed.isActive("bold"),
        italic: ed.isActive("italic"),
        underline: ed.isActive("underline"),
        strike: ed.isActive("strike"),
        code: ed.isActive("code"),
        highlight: ed.isActive("highlight"),
        link: ed.isActive("link"),
        canUndo: ed.can().undo(),
        canRedo: ed.can().redo(),
      };
    },
  }) as ToolbarEditorState;

  return (
    <div className="sticky top-(--header-h) z-(--z-toolbar) -mx-1 flex flex-wrap items-center gap-1 rounded-lg border bg-background/95 p-1 shadow-subtle backdrop-blur">
      <ToolbarButton
        label="Undo (Ctrl+Z)"
        disabled={!active.canUndo}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Redo (Ctrl+Y)"
        disabled={!active.canRedo}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="size-3.5" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 px-2 text-xs font-medium"
            />
          }
        >
          {active.h1 ? (
            <Heading1 className="size-3.5 text-primary" />
          ) : active.h2 ? (
            <Heading2 className="size-3.5 text-primary" />
          ) : active.h3 ? (
            <Heading3 className="size-3.5 text-primary" />
          ) : active.bullet ? (
            <List className="size-3.5 text-primary" />
          ) : active.ordered ? (
            <ListOrdered className="size-3.5 text-primary" />
          ) : active.task ? (
            <CheckSquare className="size-3.5 text-primary" />
          ) : active.quote ? (
            <Quote className="size-3.5 text-primary" />
          ) : active.callout ? (
            <AlertCircle className="size-3.5 text-primary" />
          ) : active.codeBlock ? (
            <Code2 className="size-3.5 text-primary" />
          ) : (
            <Type className="size-3.5 text-primary" />
          )}
          <span>{active.blockLabel}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44 text-xs">
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

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton
        label="Bold (Ctrl+B)"
        active={active.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic (Ctrl+I)"
        active={active.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Underline (Ctrl+U)"
        active={active.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={active.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Inline code"
        active={active.code}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Highlight"
        active={active.highlight}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlighter className="size-3.5 text-warning" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <LinkPopover editor={editor}>
        <ToolbarButton label="Link (Ctrl+K)" active={active.link} onClick={() => {}}>
          <Link2 className={cn("size-3.5", active.link && "text-primary")} />
        </ToolbarButton>
      </LinkPopover>

      <TableMenuDropdown editor={editor} />

      <ToolbarButton
        label="Callout"
        active={active.callout}
        onClick={() => editor.chain().focus().toggleCallout().run()}
      >
        <AlertCircle className="size-3.5" />
      </ToolbarButton>

      <ToolbarButton
        label="Divider"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="size-3.5" />
      </ToolbarButton>

      <ToolbarButton
        label="Upload Image"
        disabled={isUploading}
        onClick={onUploadClick}
      >
        {isUploading ? (
          <Spinner className="size-3.5" />
        ) : (
          <ImageIcon className="size-3.5" />
        )}
      </ToolbarButton>

      <div className="ml-auto flex items-center gap-3 pr-1 text-caption text-muted-foreground">
        <span className="hidden text-[11px] text-muted-foreground/80 md:inline">
          {stats.words} {stats.words === 1 ? "word" : "words"} ·{" "}
          {stats.characters} chars
        </span>

        <span className="flex items-center gap-1.5 text-caption font-medium">
          {pending || saveState === "saving" ? (
            <>
              <Spinner className="size-3" />
              Saving…
            </>
          ) : saveState === "saved" ? (
            <span className="flex items-center gap-1 text-success">
              <Check className="size-3" />
              Saved
            </span>
          ) : saveState === "error" ? (
            <span className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="size-3" />
              Save failed
              {onRetrySave ? (
                <button
                  type="button"
                  className="ml-1 underline underline-offset-2"
                  onClick={onRetrySave}
                >
                  Retry
                </button>
              ) : null}
            </span>
          ) : (
            "Ready"
          )}
        </span>
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  active,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
}) {
  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "h-8 w-8 transition-colors",
        active && "bg-muted font-medium text-primary",
        disabled && "pointer-events-none opacity-40"
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
