"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import type { EditorBlock } from "@/modules/editor/editor.types";
import {
  blocksToTiptapDoc,
  tiptapDocToBlocks,
} from "@/modules/editor/tiptap-mapper";
import { saveBlocksAction } from "@/modules/pages/page.actions";
import {
  confirmUploadAction,
  downloadUrlAction,
  presignUploadAction,
} from "@/modules/files/file.actions";
import { Spinner } from "@/components/ui/spinner";
import { Callout } from "@/components/editor/extensions/callout";
import { BlockId } from "@/components/editor/extensions/block-id";
import { ResizableImage } from "@/components/editor/extensions/resizable-image";
import { SlashCommand } from "@/components/editor/extensions/slash-command";
import { EditorBubbleMenu } from "@/components/editor/components/bubble-menu";
import { EditorToolbar } from "@/components/editor/editor-toolbar";

type SaveState = "idle" | "saving" | "saved" | "error";

export function PageEditor({
  workspaceId,
  pageId,
  initialBlocks,
  editable = true,
}: {
  workspaceId: string;
  pageId: string;
  initialBlocks: EditorBlock[];
  editable?: boolean;
}) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState({ words: 0, characters: 0 });
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<number | null>(null);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const persistRef = useRef<(doc: JSONContent) => void>(() => {});
  const uploadImageRef = useRef<((file: File) => Promise<void>) | null>(null);

  const initialDoc = useMemo(
    () => blocksToTiptapDoc(initialBlocks),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only seed on mount/pageId via key
    [pageId]
  );

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      ResizableImage.configure({ allowBase64: false }),
      Callout,
      BlockId,
      SlashCommand,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") {
            return `Heading ${node.attrs.level}...`;
          }
          return "Type '/' for commands, or start typing...";
        },
      }),
    ],
    []
  );

  const persist = useCallback(
    (doc: JSONContent) => {
      const blocks = tiptapDocToBlocks(doc);
      startTransition(async () => {
        setSaveState("saving");
        const result = await saveBlocksAction({
          workspaceId,
          pageId,
          blocks,
        });
        setSaveState(result.success ? "saved" : "error");
      });
    },
    [pageId, workspaceId]
  );

  persistRef.current = persist;

  const flushSave = useCallback(() => {
    if (saveTimerRef.current == null) return;
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    const ed = editorRef.current;
    if (ed && !ed.isDestroyed) {
      persistRef.current(ed.getJSON());
    }
  }, []);

  const updateStats = useCallback((text: string) => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const characters = text.length;
    setStats((prev) =>
      prev.words === words && prev.characters === characters
        ? prev
        : { words, characters }
    );
  }, []);

  // Stable across re-renders so TipTap does not re-apply content via setOptions.
  const contentRef = useRef(initialDoc);
  const editableRef = useRef(editable);
  editableRef.current = editable;

  const editorProps = useMemo(
    () => ({
      attributes: {
        class: "max-w-none min-h-[500px] focus:outline-none px-1 py-4",
      },
      handleDrop: (_view: unknown, event: DragEvent) => {
        const files = event.dataTransfer?.files;
        if (!files?.length || !editableRef.current) return false;
        const file = files[0];
        if (!file.type.startsWith("image/")) return false;
        event.preventDefault();
        void uploadImageRef.current?.(file);
        return true;
      },
      handlePaste: (_view: unknown, event: ClipboardEvent) => {
        const files = event.clipboardData?.files;
        if (!files?.length || !editableRef.current) return false;
        const file = files[0];
        if (!file.type.startsWith("image/")) return false;
        event.preventDefault();
        void uploadImageRef.current?.(file);
        return true;
      },
    }),
    []
  );

  const onCreate = useCallback(
    ({ editor: ed }: { editor: NonNullable<ReturnType<typeof useEditor>> }) => {
      updateStats(ed.state.doc.textContent);
    },
    [updateStats]
  );

  const onUpdate = useCallback(
    ({ editor: ed }: { editor: NonNullable<ReturnType<typeof useEditor>> }) => {
      updateStats(ed.state.doc.textContent);
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        persistRef.current(ed.getJSON());
      }, 700);
    },
    [updateStats]
  );

  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      editable,
      extensions,
      content: contentRef.current,
      editorProps,
      onCreate,
      onUpdate,
    },
    // Non-empty deps skip TipTap's per-render setOptions path, which otherwise
    // re-applies `content` and can infinite-loop with React setState.
    [pageId]
  );

  editorRef.current = editor;

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  useEffect(() => {
    const handleImageRequest = () => {
      fileInputRef.current?.click();
    };
    const onPageHide = () => flushSave();
    window.addEventListener("editor:request-image-upload", handleImageRequest);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener(
        "editor:request-image-upload",
        handleImageRequest
      );
      window.removeEventListener("pagehide", onPageHide);
      flushSave();
    };
  }, [flushSave]);

  async function uploadImage(file: File) {
    if (!editor) return;
    setIsUploading(true);
    try {
      const signed = await presignUploadAction({
        workspaceId,
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });
      if (!signed.success || !signed.data) {
        setSaveState("error");
        return;
      }
      const data = signed.data as { fileId: string; uploadUrl: string };
      const put = await fetch(data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) {
        setSaveState("error");
        return;
      }
      await confirmUploadAction({ workspaceId, fileId: data.fileId });
      const download = await downloadUrlAction({
        workspaceId,
        fileId: data.fileId,
      });
      if (!download.success || !download.data) {
        setSaveState("error");
        return;
      }
      const { downloadUrl } = download.data as { downloadUrl: string };
      editor
        .chain()
        .focus()
        .insertContent({
          type: "image",
          attrs: {
            src: downloadUrl,
            alt: file.name,
            fileId: data.fileId,
          },
        })
        .run();
      persist(editor.getJSON());
    } finally {
      setIsUploading(false);
    }
  }

  uploadImageRef.current = uploadImage;

  if (!editor) {
    return (
      <div className="flex items-center gap-2 py-8 text-caption text-muted-foreground">
        <Spinner className="size-4" />
        Loading editor…
      </div>
    );
  }

  return (
    <div className="relative space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void uploadImage(file);
            e.target.value = "";
          }
        }}
      />

      {editable ? (
        <EditorToolbar
          editor={editor}
          isUploading={isUploading}
          pending={pending}
          saveState={saveState}
          stats={stats}
          onUploadClick={() => fileInputRef.current?.click()}
          onRetrySave={() => {
            if (!editor || editor.isDestroyed) return;
            persist(editor.getJSON());
          }}
        />
      ) : null}

      {editable ? <EditorBubbleMenu editor={editor} /> : null}

      <EditorContent editor={editor} />
    </div>
  );
}
