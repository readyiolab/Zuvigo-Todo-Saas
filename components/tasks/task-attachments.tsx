"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  attachFileToTaskAction,
  detachTaskAttachmentAction,
  listTaskAttachmentsAction,
} from "@/modules/tasks/task.actions";
import {
  confirmUploadAction,
  downloadUrlAction,
  markFailedUploadAction,
  presignUploadAction,
} from "@/modules/files/file.actions";
import { getMaxUploadBytesClient } from "@/lib/upload-limits";
import { FilePreviewCard } from "@/components/tasks/file-preview-card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

type Attachment = {
  id: string;
  fileId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export function TaskAttachments({
  workspaceId,
  workspaceSlug,
  taskId,
  canEdit,
}: {
  workspaceId: string;
  workspaceSlug: string;
  taskId: string;
  canEdit: boolean;
}) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<
    Array<{
      localId: string;
      filename: string;
      contentType: string;
      sizeBytes: number;
      localUrl: string;
      progress: number;
      status: "uploading" | "error";
    }>
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function refresh() {
    startTransition(async () => {
      const result = await listTaskAttachmentsAction({ workspaceId, taskId });
      if (!result.success || !result.data) {
        setLoading(false);
        return;
      }
      const attachments = (result.data as { attachments: Attachment[] })
        .attachments;
      setItems(attachments);
      setLoading(false);
      const nextUrls: Record<string, string> = {};
      await Promise.all(
        attachments.map(async (a) => {
          const dl = await downloadUrlAction({
            workspaceId,
            fileId: a.fileId,
          });
          if (dl.success && dl.data) {
            nextUrls[a.fileId] = (dl.data as { downloadUrl: string })
              .downloadUrl;
          }
        })
      );
      setUrls(nextUrls);
    });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, workspaceId]);

  async function onUpload(files: FileList | null) {
    if (!files?.length || !canEdit) return;
    const max = getMaxUploadBytesClient();

    for (const file of Array.from(files)) {
      const localId = `${Date.now()}-${file.name}`;
      const localUrl = URL.createObjectURL(file);
      if (file.size > max) {
        toast.error(`File exceeds ${Math.round(max / (1024 * 1024))}MB limit`);
        URL.revokeObjectURL(localUrl);
        continue;
      }

      setUploading((prev) => [
        ...prev,
        {
          localId,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          localUrl,
          progress: 10,
          status: "uploading",
        },
      ]);

      const contentType = file.type || "application/octet-stream";
      const signed = await presignUploadAction({
        workspaceId,
        filename: file.name,
        contentType,
        sizeBytes: file.size,
      });
      if (!signed.success || !signed.data) {
        toast.error(signed.success ? "Upload failed" : signed.error.message);
        setUploading((prev) =>
          prev.map((u) =>
            u.localId === localId ? { ...u, status: "error" } : u
          )
        );
        continue;
      }
      const data = signed.data as { fileId: string; uploadUrl: string };
      setUploading((prev) =>
        prev.map((u) =>
          u.localId === localId ? { ...u, progress: 50 } : u
        )
      );
      try {
        const put = await fetch(data.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": contentType },
          body: file,
        });
        if (!put.ok) throw new Error("put failed");
        setUploading((prev) =>
          prev.map((u) =>
            u.localId === localId ? { ...u, progress: 80 } : u
          )
        );
        await confirmUploadAction({ workspaceId, fileId: data.fileId });
        const attached = await attachFileToTaskAction({
          workspaceId,
          workspaceSlug,
          taskId,
          fileId: data.fileId,
        });
        if (!attached.success) {
          toast.error(attached.error.message);
          await markFailedUploadAction({
            workspaceId,
            fileId: data.fileId,
          });
        }
        setUploading((prev) => prev.filter((u) => u.localId !== localId));
        URL.revokeObjectURL(localUrl);
      } catch {
        await markFailedUploadAction({ workspaceId, fileId: data.fileId });
        setUploading((prev) =>
          prev.map((u) =>
            u.localId === localId ? { ...u, status: "error" } : u
          )
        );
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    toast.success("Attachment added");
    refresh();
  }

  function remove(attachmentId: string) {
    if (!canEdit) return;
    startTransition(async () => {
      const result = await detachTaskAttachmentAction({
        workspaceId,
        workspaceSlug,
        taskId,
        attachmentId,
      });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      refresh();
    });
  }

  const fileInput = canEdit ? (
    <input
      ref={fileInputRef}
      type="file"
      multiple
      className="hidden"
      tabIndex={-1}
      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
      disabled={pending}
      onChange={(e) => {
        void onUpload(e.target.files);
        e.target.value = "";
      }}
    />
  ) : null;

  if (loading) {
    return (
      <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
        <Spinner className="size-3" /> Loading…
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {fileInput}
      {uploading.map((u) => (
        <FilePreviewCard
          key={u.localId}
          filename={u.filename}
          contentType={u.contentType}
          sizeBytes={u.sizeBytes}
          localUrl={u.localUrl}
          progress={u.progress}
          status={u.status}
          onRemove={() => {
            URL.revokeObjectURL(u.localUrl);
            setUploading((prev) => prev.filter((x) => x.localId !== u.localId));
          }}
        />
      ))}
      {items.length === 0 && uploading.length === 0
        ? canEdit
          ? (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                className="h-7 px-1.5 text-[13px] text-foreground/80 hover:text-foreground"
                disabled={pending}
                onClick={() => fileInputRef.current?.click()}
              >
                + Attach file
              </Button>
            )
          : null
        : items.map((item) => (
          <FilePreviewCard
            key={item.id}
            filename={item.filename}
            contentType={item.contentType}
            sizeBytes={item.sizeBytes}
            url={urls[item.fileId]}
            status="ready"
            onRemove={canEdit ? () => remove(item.id) : undefined}
          />
        ))}
      {canEdit && items.length > 0 ? (
        <Button
          type="button"
          size="xs"
          variant="ghost"
          className="mt-1 h-7 px-1.5 text-caption text-muted-foreground"
          disabled={pending}
          onClick={() => fileInputRef.current?.click()}
        >
          + Attach file
        </Button>
      ) : null}
    </div>
  );
}
