"use client";

import { useRef, useState } from "react";
import { Paperclip, Send, Smile } from "lucide-react";
import {
  confirmUploadAction,
  markFailedUploadAction,
  presignUploadAction,
} from "@/modules/files/file.actions";
import { getMaxUploadBytesClient } from "@/lib/upload-limits";
import { EmojiPickerPopover } from "@/components/tasks/emoji-picker-popover";
import { FilePreviewCard } from "@/components/tasks/file-preview-card";
import {
  VoiceRecorder,
  type VoiceRecording,
} from "@/components/tasks/voice-recorder";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type DraftAttachment = {
  localId: string;
  file: File;
  filename: string;
  contentType: string;
  sizeBytes: number;
  localUrl: string;
  progress: number;
  status: "uploading" | "ready" | "error";
  fileId?: string;
};

function extensionForVoice(contentType: string) {
  return contentType.includes("webm") ? "webm" : "m4a";
}

export function CommentComposer({
  workspaceId,
  disabled,
  pending,
  onSubmit,
}: {
  workspaceId: string;
  disabled?: boolean;
  pending?: boolean;
  onSubmit: (input: { body: string; fileIds: string[] }) => Promise<boolean>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [body, setBody] = useState("");
  const [drafts, setDrafts] = useState<DraftAttachment[]>([]);
  const [voice, setVoice] = useState<VoiceRecording | null>(null);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File, localId: string): Promise<string | null> {
    const max = getMaxUploadBytesClient();
    if (file.size > max) {
      toast.error(`File exceeds ${Math.round(max / (1024 * 1024))}MB limit`);
      setDrafts((prev) =>
        prev.map((d) =>
          d.localId === localId ? { ...d, status: "error" as const } : d
        )
      );
      return null;
    }

    const contentType = (file.type || "application/octet-stream").split(
      ";"
    )[0];
    setDrafts((prev) =>
      prev.map((d) =>
        d.localId === localId
          ? { ...d, status: "uploading", progress: 10, contentType }
          : d
      )
    );

    const signed = await presignUploadAction({
      workspaceId,
      filename: file.name,
      contentType,
      sizeBytes: file.size,
    });
    if (!signed.success || !signed.data) {
      toast.error(signed.success ? "Upload failed" : signed.error.message);
      setDrafts((prev) =>
        prev.map((d) =>
          d.localId === localId ? { ...d, status: "error" } : d
        )
      );
      return null;
    }

    const data = signed.data as { fileId: string; uploadUrl: string };
    setDrafts((prev) =>
      prev.map((d) =>
        d.localId === localId ? { ...d, progress: 45, fileId: data.fileId } : d
      )
    );

    try {
      const put = await fetch(data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!put.ok) throw new Error("PUT failed");
      setDrafts((prev) =>
        prev.map((d) =>
          d.localId === localId ? { ...d, progress: 80 } : d
        )
      );
      const confirmed = await confirmUploadAction({
        workspaceId,
        fileId: data.fileId,
      });
      if (!confirmed.success) {
        await markFailedUploadAction({ workspaceId, fileId: data.fileId });
        throw new Error(confirmed.error.message);
      }
      setDrafts((prev) =>
        prev.map((d) =>
          d.localId === localId
            ? { ...d, status: "ready", progress: 100, fileId: data.fileId }
            : d
        )
      );
      return data.fileId;
    } catch {
      await markFailedUploadAction({ workspaceId, fileId: data.fileId });
      setDrafts((prev) =>
        prev.map((d) =>
          d.localId === localId ? { ...d, status: "error" } : d
        )
      );
      toast.error(`Failed to upload ${file.name}`);
      return null;
    }
  }

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const next: DraftAttachment[] = Array.from(list).map((file) => ({
      localId: `${Date.now()}-${file.name}-${Math.random()}`,
      file,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      localUrl: URL.createObjectURL(file),
      progress: 0,
      status: "uploading" as const,
    }));
    setDrafts((prev) => [...prev, ...next]);
    setExpanded(true);
    void (async () => {
      for (const draft of next) {
        await uploadFile(draft.file, draft.localId);
      }
    })();
  }

  async function uploadVoice(): Promise<string | null> {
    if (!voice) return null;
    const file = new File(
      [voice.blob],
      voice.filename || `voice.${extensionForVoice(voice.contentType)}`,
      { type: voice.contentType }
    );
    const localId = `voice-${Date.now()}`;
    setDrafts((prev) => [
      ...prev,
      {
        localId,
        file,
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        localUrl: voice.url,
        progress: 0,
        status: "uploading",
      },
    ]);
    return uploadFile(file, localId);
  }

  async function submit() {
    if (disabled || pending || uploading) return;
    const text = body.trim();
    const readyIds = drafts
      .filter((d) => d.status === "ready" && d.fileId)
      .map((d) => d.fileId!);
    if (drafts.some((d) => d.status === "uploading")) {
      toast.error("Wait for uploads to finish");
      return;
    }
    if (drafts.some((d) => d.status === "error")) {
      toast.error("Remove or retry failed uploads");
      return;
    }

    setUploading(true);
    try {
      let fileIds = [...readyIds];
      if (voice) {
        const voiceId = await uploadVoice();
        if (voiceId) fileIds.push(voiceId);
        else if (!text && fileIds.length === 0) {
          setUploading(false);
          return;
        }
      }
      if (!text && fileIds.length === 0) {
        toast.error("Add a comment or attachment");
        setUploading(false);
        return;
      }
      const ok = await onSubmit({ body: text, fileIds });
      if (ok) {
        drafts.forEach((d) => URL.revokeObjectURL(d.localUrl));
        if (voice) URL.revokeObjectURL(voice.url);
        setBody("");
        setDrafts([]);
        setVoice(null);
        setExpanded(false);
      }
    } finally {
      setUploading(false);
    }
  }

  function insertEmoji(emoji: string) {
    const el = textareaRef.current;
    if (!el) {
      setBody((b) => b + emoji);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + emoji + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  }

  const busy = pending || uploading;

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-background transition-[box-shadow,border-color]",
        expanded && "border-border/70 shadow-sm ring-1 ring-primary/10"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <Textarea
        ref={textareaRef}
        value={body}
        disabled={disabled || busy}
        rows={expanded ? 3 : 1}
        placeholder="Comment"
        onFocus={() => setExpanded(true)}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void submit();
          }
        }}
        className={cn(
          "resize-none border-0 bg-transparent px-3 py-2.5 text-[14px] shadow-none focus-visible:ring-0",
          expanded ? "min-h-[4.5rem]" : "min-h-10"
        )}
      />

      {(drafts.length > 0 || voice) && (
        <div className="space-y-2 border-t border-border/40 px-2.5 py-2">
          {voice && !drafts.some((d) => d.localUrl === voice.url) ? (
            <VoiceRecorder
              recording={voice}
              onRecorded={setVoice}
              onClear={() => setVoice(null)}
              disabled={busy}
            />
          ) : null}
          {drafts.map((d) => (
            <FilePreviewCard
              key={d.localId}
              filename={d.filename}
              contentType={d.contentType}
              sizeBytes={d.sizeBytes}
              localUrl={d.localUrl}
              progress={d.progress}
              status={d.status}
              onRemove={() => {
                URL.revokeObjectURL(d.localUrl);
                setDrafts((prev) => prev.filter((x) => x.localId !== d.localId));
              }}
              onRetry={() => {
                void uploadFile(d.file, d.localId);
              }}
            />
          ))}
        </div>
      )}

      {expanded ? (
        <div className="flex items-center gap-0.5 border-t border-border/40 px-1.5 py-1.5">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="size-8 text-muted-foreground"
            disabled={disabled || busy}
            aria-label="Attach file"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="size-4" />
          </Button>

          {!voice ? (
            <VoiceRecorder
              disabled={disabled || busy}
              recording={null}
              onRecorded={(rec) => {
                setVoice(rec);
                setExpanded(true);
              }}
              onClear={() => setVoice(null)}
            />
          ) : null}

          <EmojiPickerPopover onSelect={insertEmoji}>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="size-8 text-muted-foreground"
              disabled={disabled || busy}
              aria-label="Insert emoji"
            >
              <Smile className="size-4" />
            </Button>
          </EmojiPickerPopover>

          <div className="ml-auto">
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5"
              disabled={
                disabled ||
                busy ||
                (!body.trim() && drafts.length === 0 && !voice)
              }
              onClick={() => void submit()}
            >
              {busy ? <Spinner className="size-3.5" /> : <Send className="size-3.5" />}
              Send
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
