"use server";

import { requireUser } from "@/modules/auth/auth.service";
import {
  confirmUpload,
  createUploadUrl,
  getDownloadUrl,
} from "@/modules/files/file.service";
import {
  type ActionResult,
  failAction,
  okAction,
} from "@/shared/actions/result";

export type { ActionResult };

export async function presignUploadAction(input: {
  workspaceId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = await createUploadUrl(user.id, input);
    return okAction(data);
  } catch (error) {
    return failAction(error, "file_action_error");
  }
}

export async function confirmUploadAction(input: {
  workspaceId: string;
  fileId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = await confirmUpload(user.id, input.fileId, input.workspaceId);
    return okAction(data);
  } catch (error) {
    return failAction(error, "file_action_error");
  }
}

export async function downloadUrlAction(input: {
  workspaceId: string;
  fileId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = await getDownloadUrl(user.id, input.fileId, input.workspaceId);
    return okAction(data);
  } catch (error) {
    return failAction(error, "file_action_error");
  }
}

export async function markFailedUploadAction(input: {
  workspaceId: string;
  fileId: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const { markFileFailed } = await import("@/modules/files/file.service");
    await markFileFailed(input.fileId, input.workspaceId, user.id);
    return okAction();
  } catch (error) {
    return failAction(error, "file_action_error");
  }
}
