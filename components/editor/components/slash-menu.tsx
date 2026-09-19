"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useRef,
  type ReactNode,
} from "react";
import type { Editor, Range } from "@tiptap/core";
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code2,
  Table as TableIcon,
  AlertCircle,
  Minus,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CommandItem {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  category: string;
  aliases?: string[];
  command: (params: { editor: Editor; range: Range }) => void;
}

export const SLASH_COMMAND_ITEMS: CommandItem[] = [
  {
    id: "paragraph",
    title: "Text",
    description: "Just start writing with plain text.",
    icon: <Type className="size-4 text-muted-foreground" />,
    category: "Basic blocks",
    aliases: ["p", "paragraph", "plain"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    id: "heading_1",
    title: "Heading 1",
    description: "Large section heading.",
    icon: <Heading1 className="size-4 text-muted-foreground" />,
    category: "Basic blocks",
    aliases: ["h1", "title", "header1"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    id: "heading_2",
    title: "Heading 2",
    description: "Medium section heading.",
    icon: <Heading2 className="size-4 text-muted-foreground" />,
    category: "Basic blocks",
    aliases: ["h2", "subtitle", "header2"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    id: "heading_3",
    title: "Heading 3",
    description: "Small section heading.",
    icon: <Heading3 className="size-4 text-muted-foreground" />,
    category: "Basic blocks",
    aliases: ["h3", "subheading", "header3"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    id: "bullet_list",
    title: "Bullet list",
    description: "Create a simple bulleted list.",
    icon: <List className="size-4 text-muted-foreground" />,
    category: "Lists",
    aliases: ["ul", "bullet", "unordered"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    id: "ordered_list",
    title: "Numbered list",
    description: "Create a list with numbering.",
    icon: <ListOrdered className="size-4 text-muted-foreground" />,
    category: "Lists",
    aliases: ["ol", "numbered", "numbers"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    id: "task_list",
    title: "To-do list",
    description: "Track tasks with an interactive checklist.",
    icon: <CheckSquare className="size-4 text-muted-foreground" />,
    category: "Lists",
    aliases: ["todo", "task", "check", "checklist"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    id: "quote",
    title: "Quote",
    description: "Capture a quote or highlighted callout.",
    icon: <Quote className="size-4 text-muted-foreground" />,
    category: "Advanced",
    aliases: ["blockquote", "quote", "citation"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    id: "code_block",
    title: "Code block",
    description: "Code snippet with formatted code block.",
    icon: <Code2 className="size-4 text-muted-foreground" />,
    category: "Advanced",
    aliases: ["code", "pre", "snippet"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    id: "callout",
    title: "Callout",
    description: "Make writing stand out with an info callout.",
    icon: <AlertCircle className="size-4 text-muted-foreground" />,
    category: "Advanced",
    aliases: ["callout", "note", "alert", "info"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCallout().run();
    },
  },
  {
    id: "table",
    title: "Table",
    description: "Insert a 3x3 table with headers.",
    icon: <TableIcon className="size-4 text-muted-foreground" />,
    category: "Advanced",
    aliases: ["table", "grid", "spreadsheet"],
    command: ({ editor, range }) => {
      const chain = editor.chain().focus().deleteRange(range) as unknown as {
        insertTable: (options: { rows: number; cols: number; withHeaderRow: boolean }) => { run: () => boolean };
      };
      chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    id: "divider",
    title: "Divider",
    description: "Visually separate sections with a horizontal line.",
    icon: <Minus className="size-4 text-muted-foreground" />,
    category: "Advanced",
    aliases: ["divider", "hr", "horizontal rule", "line"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    id: "image",
    title: "Image",
    description: "Upload an image from your computer.",
    icon: <ImageIcon className="size-4 text-muted-foreground" />,
    category: "Media",
    aliases: ["image", "picture", "photo", "upload", "img"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      const event = new CustomEvent("editor:request-image-upload");
      window.dispatchEvent(event);
    },
  },
];

export interface SlashMenuListProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

export interface SlashMenuHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const SlashMenuList = forwardRef<SlashMenuHandle, SlashMenuListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
          return true;
        }

        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (prev + 1) % items.length);
          return true;
        }

        if (event.key === "Enter" || event.key === "Tab") {
          selectItem(selectedIndex);
          return true;
        }

        return false;
      },
    }));

    useEffect(() => {
      const activeEl = scrollContainerRef.current?.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }, [selectedIndex]);

    if (items.length === 0) {
      return (
        <div className="z-50 w-72 rounded-lg border bg-popover p-3 text-center text-xs text-muted-foreground shadow-overlay animate-in fade-in-50 zoom-in-95">
          No matching commands
        </div>
      );
    }

    return (
      <div
        ref={scrollContainerRef}
        className="z-50 flex max-h-80 w-76 flex-col overflow-y-auto rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-overlay animate-in fade-in-50 zoom-in-95"
      >
        <div className="px-2 py-1 text-[10px] font-medium tracking-wider uppercase text-muted-foreground">
          Commands
        </div>
        <div className="flex flex-col gap-0.5">
          {items.map((item, index) => {
            const isSelected = index === selectedIndex;
            return (
              <button
                key={item.id}
                type="button"
                data-index={index}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                  isSelected
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-foreground hover:bg-muted/70"
                )}
                onClick={() => selectItem(index)}
              >
                <div
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-md border bg-background",
                    isSelected && "border-primary/40 text-primary"
                  )}
                >
                  {item.icon}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate font-medium">{item.title}</span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {item.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
);

SlashMenuList.displayName = "SlashMenuList";
