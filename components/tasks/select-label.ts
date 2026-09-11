/** Resolve a select option label; never expose raw sentinel/codes to users. */
export function selectOptionLabel(
  options: Array<{ value: string; label: string }>,
  value: string | null | undefined,
  fallback = ""
) {
  if (value == null || value === "") return fallback;
  // Never expose raw internal values like "__all" or enum codes in UI.
  return options.find((o) => o.value === value)?.label ?? fallback;
}

export function isTaskIconImage(icon: string | null | undefined) {
  if (!icon) return false;
  return (
    icon.startsWith("http://") ||
    icon.startsWith("https://") ||
    icon.startsWith("/") ||
    icon.startsWith("data:")
  );
}
