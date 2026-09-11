"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export type VoiceRecording = {
  blob: Blob;
  url: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  durationSeconds: number;
};

export function VoiceRecorder({
  disabled,
  onRecorded,
  onClear,
  recording,
  className,
}: {
  disabled?: boolean;
  onRecorded: (rec: VoiceRecording) => void;
  onClear: () => void;
  recording: VoiceRecording | null;
  className?: string;
}) {
  const [active, setActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAt = useRef(0);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopTracks();
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, []);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function start() {
    if (disabled || active) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      const type = (recorder.mimeType || mime || "audio/webm").split(";")[0];
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type });
        const url = URL.createObjectURL(blob);
        const durationSeconds = Math.max(
          1,
          Math.round((Date.now() - startedAt.current) / 1000)
        );
        const ext = type.includes("webm") ? "webm" : "m4a";
        onRecorded({
          blob,
          url,
          filename: `voice-${Date.now()}.${ext}`,
          contentType: type,
          sizeBytes: blob.size,
          durationSeconds,
        });
        stopTracks();
      };
      mediaRef.current = recorder;
      startedAt.current = Date.now();
      setElapsed(0);
      tickRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
      }, 250);
      recorder.start();
      setActive(true);
    } catch {
      toast.error("Microphone permission is required for voice comments");
    }
  }

  function stop() {
    if (!mediaRef.current || mediaRef.current.state === "inactive") return;
    mediaRef.current.stop();
    setActive(false);
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  function cancel() {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.onstop = null;
      mediaRef.current.stop();
    }
    stopTracks();
    setActive(false);
    setElapsed(0);
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  if (recording) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-2 py-1.5",
          className
        )}
      >
        <audio src={recording.url} controls className="h-8 min-w-0 flex-1" />
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {formatDuration(recording.durationSeconds)}
        </span>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className="size-7"
          aria-label="Remove recording"
          onClick={() => {
            URL.revokeObjectURL(recording.url);
            onClear();
          }}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    );
  }

  if (active) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive-soft/30 px-2 py-1.5",
          className
        )}
      >
        <span className="size-2 animate-pulse rounded-full bg-destructive" />
        <span className="text-[13px] tabular-nums">
          Recording {formatDuration(elapsed)}
        </span>
        <div className="ml-auto flex gap-1">
          <Button type="button" size="xs" variant="ghost" onClick={cancel}>
            Cancel
          </Button>
          <Button type="button" size="xs" onClick={stop}>
            <Square className="size-3" /> Stop
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      className={cn("size-8 text-muted-foreground", className)}
      disabled={disabled}
      aria-label="Record voice comment"
      onClick={() => void start()}
    >
      <Mic className="size-4" />
    </Button>
  );
}
