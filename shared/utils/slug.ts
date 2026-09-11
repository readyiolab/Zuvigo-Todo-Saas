export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return base || "workspace";
}

export function uniqueSlug(base: string, suffix: string): string {
  const clean = slugify(base).slice(0, 40);
  return `${clean}-${suffix.toLowerCase().slice(0, 8)}`;
}
