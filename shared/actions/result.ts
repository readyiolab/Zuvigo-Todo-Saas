import { AppError, toErrorResponse } from "@/shared/errors";
import { logger } from "@/shared/logger";

export type ActionResult<T = unknown> =
  | { success: true; data?: T }
  | { success: false; error: { code: string; message: string } };

export function failAction<T = unknown>(
  error: unknown,
  logEvent = "action_unexpected_error"
): ActionResult<T> {
  const mapped = toErrorResponse(error);
  if (!(error instanceof AppError)) {
    logger.error(logEvent, {
      error: error instanceof Error ? error.message : "unknown",
    });
  }
  return { success: false, error: mapped.error };
}

export function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export function okAction<T = unknown>(data?: T): ActionResult<T> {
  return data === undefined ? { success: true } : { success: true, data };
}

