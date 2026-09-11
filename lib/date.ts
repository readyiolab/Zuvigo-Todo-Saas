import { format, isValid, parseISO } from "date-fns";

/** Format a date for display in the user's local timezone (yyyy-MM-dd). */
export function formatDateLocal(
  value: Date | string | null | undefined,
  pattern = "MMM d, yyyy"
): string {
  if (!value) return "";
  const date = typeof value === "string" ? parseISO(value) : value;
  if (!isValid(date)) return "";
  return format(date, pattern);
}

/** Short local date for dense tables (e.g. Mar 4). */
export function formatDueDate(
  value: Date | string | null | undefined
): string {
  return formatDateLocal(value, "MMM d, yyyy");
}
