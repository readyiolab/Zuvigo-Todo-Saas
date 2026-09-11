"use client";

import {
  ExternalLink,
  FileIcon,
  FileSpreadsheet,
  FileText,
  Film,
  ImageIcon,
  Loader2,
  Music,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FilePreviewKind =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "word"
  | "excel"
  | "generic";

export function filePreviewKind(contentType: string, filename = ""): FilePreviewKind {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType === "application/pdf" || filename.endsWith(".pdf")) return "pdf";
  if (
    contentType.includes("word") ||
    /\.docx?$/i.test(filename)
  ) {
    return "word";
  }
  if (
    contentType.includes("sheet") ||
    contentType.includes("excel") ||
    /\.xlsx?$/i.test(filename)
  ) {
    return "excel";
  }
  return "generic";
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const KIND_ICON = {
  image: ImageIcon,
  video: Film,
  audio: Music,
  pdf: FileText,
  word: FileText,
  excel: FileSpreadsheet,
  generic: FileIcon,
} as const;

export function FilePreviewCard({
  filename,
  contentType,
  sizeBytes: _sizeBytes,
  url,
  localUrl,
  progress,
  status = "ready",
  onRemove,
  onRetry,
  compact = true,
  className,
}: {
  filename: string;
  contentType: string;
  sizeBytes: number;
  url?: string | null;
  localUrl?: string | null;
  progress?: number;
  status?: "uploading" | "ready" | "error" | "recording";
  onRemove?: () => void;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}) {
  const kind = filePreviewKind(contentType, filename);
  const Icon = KIND_ICON[kind];
  const previewSrc = localUrl || url || null;
  const canOpen = status === "ready" && Boolean(previewSrc);
  const awaitingUrl = status === "ready" && !previewSrc;

  const subtitle =
    status === "uploading" && progress != null
      ? `${Math.round(progress)}%`
      : status === "error"
        ? "Upload failed"
        : awaitingUrl
          ? "Preparing…"
          : null;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border/50 bg-muted/20",
        compact ? "p-2" : "p-3",
        className
      )}
    >
      {kind === "image" && previewSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <a
          href={previewSrc}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 block outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          aria-label={`Open ${filename}`}
        >
          <img
            src={previewSrc}
            alt={filename}
            className="max-h-28 w-full rounded-md object-cover transition-opacity hover:opacity-90"
          />
        </a>
      ) : null}
      {kind === "video" && previewSrc ? (
        <video
          src={previewSrc}
          controls
          className="mb-2 max-h-32 w-full rounded-md bg-black"
        />
      ) : null}
      {kind === "audio" && previewSrc ? (
        <audio src={previewSrc} controls className="mb-2 w-full" />
      ) : null}

      <div className="flex items-center gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
          {status === "uploading" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Icon className="size-3.5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {canOpen ? (
            <a
              href={previewSrc!}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-[13px] font-medium text-foreground underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              {filename}
            </a>
          ) : (
            <p className="truncate text-[13px] font-medium">{filename}</p>
          )}
          {subtitle ? (
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          ) : null}
          {status === "uploading" && progress != null ? (
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary/70 transition-[width]"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {canOpen ? (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              className="size-6"
              aria-label={`Open ${filename}`}
              render={
                <a
                  href={previewSrc!}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <ExternalLink className="size-3" />
            </Button>
          ) : null}
          {status === "error" && onRetry ? (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              className="size-6"
              aria-label="Retry upload"
              onClick={onRetry}
            >
              <RefreshCw className="size-3" />
            </Button>
          ) : null}
          {onRemove ? (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              className="size-6"
              aria-label={`Remove ${filename}`}
              onClick={onRemove}
            >
              <X className="size-3" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function CommentAudioPlayer({
  src,
  filename,
}: {
  src: string;
  filename?: string;
}) {
  return (
    <div className="mt-2 flex max-w-sm items-center gap-2 rounded-full border border-border/50 bg-muted/30 px-3 py-1.5">
      <audio src={src} controls className="h-8 min-w-0 flex-1" aria-label={filename || "Voice comment"} />
    </div>
  );
}
