"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, X } from "lucide-react";
import {
  confirmUploadAction,
  downloadUrlAction,
  presignUploadAction,
} from "@/modules/files/file.actions";
import { isTaskIconImage } from "@/components/tasks/select-label";
import { EmojiPickerPopover } from "@/components/tasks/emoji-picker-popover";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#64748b",
  "#0ea5e9",
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#a855f7",
];

export function TaskIconColor({
  workspaceId,
  icon,
  color,
  onIconChange,
  onColorChange,
  disabled,
}: {
  workspaceId?: string;
  icon: string;
  color: string;
  onIconChange: (icon: string) => void;
  onColorChange: (color: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const image = isTaskIconImage(icon);

  function upload(file: File | undefined) {
    if (!file || !workspaceId || disabled) return;
    startTransition(async () => {
      const signed = await presignUploadAction({
        workspaceId,
        filename: file.name,
        contentType: file.type || "image/png",
        sizeBytes: file.size,
      });
      if (!signed.success || !signed.data) {
        toast.error(signed.success ? "Upload failed" : signed.error.message);
        return;
      }
      const data = signed.data as { fileId: string; uploadUrl: string };
      const put = await fetch(data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/png" },
        body: file,
      });
      if (!put.ok) {
        toast.error("Could not upload the picture");
        return;
      }
      await confirmUploadAction({ workspaceId, fileId: data.fileId });
      const dl = await downloadUrlAction({ workspaceId, fileId: data.fileId });
      if (!dl.success || !dl.data) {
        toast.error("Picture uploaded but preview failed");
        return;
      }
      onIconChange((dl.data as { downloadUrl: string }).downloadUrl);
      setOpen(false);
      toast.success("Picture added");
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <EmojiPickerPopover
        value={!image ? icon : ""}
        imageSrc={image ? icon : null}
        disabled={disabled || pending}
        onSelect={onIconChange}
      />
      {!disabled ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            disabled={disabled || pending}
            render={
              <button
                type="button"
                disabled={disabled || pending}
                aria-label="Task color"
                className={cn(
                  "size-3.5 rounded-full border border-black/10 shadow-sm transition-transform hover:scale-110",
                  !color && "bg-muted"
                )}
                style={color ? { backgroundColor: color } : undefined}
              />
            }
          />
          <PopoverContent align="start" className="w-52 gap-2 p-3">
            <p className="text-caption font-medium text-muted-foreground">
              Color
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className={cn(
                  "size-5 rounded-full border border-dashed border-border",
                  !color && "ring-2 ring-ring ring-offset-1"
                )}
                aria-label="No color"
                onClick={() => onColorChange("")}
              />
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onColorChange(c);
                  }}
                  className={cn(
                    "size-5 rounded-full border border-black/10",
                    color === c && "ring-2 ring-ring ring-offset-1"
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
            <div className="flex gap-1 border-t border-border/60 pt-2">
              {workspaceId ? (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    tabIndex={-1}
                    disabled={pending}
                    onChange={(e) => {
                      upload(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    className="h-7 flex-1 justify-start px-2"
                    disabled={pending}
                    onClick={() => fileRef.current?.click()}
                  >
                    <ImagePlus className="size-3.5" />
                    Photo
                  </Button>
                </>
              ) : null}
              {icon ? (
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  className="h-7 px-2"
                  disabled={pending}
                  onClick={() => onIconChange("")}
                >
                  <X className="size-3.5" />
                  Clear
                </Button>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
      ) : color ? (
        <span
          className="size-3.5 rounded-full border border-black/10"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
