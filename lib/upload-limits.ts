/** Client-safe max upload size (must match server default when env not injected). */
export const DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function getMaxUploadBytesClient() {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_MAX_UPLOAD_BYTES) {
    const n = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_BYTES);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_MAX_UPLOAD_BYTES;
}
