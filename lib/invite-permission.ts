export type InviteAccessLevel =
  | "full_access"
  | "can_edit"
  | "can_comment"
  | "can_view";

export type InviteScope = "workspace" | "page";

export type PagePermissionLevel = "view" | "comment" | "edit" | "full";

export type WorkspaceInviteRole = "ADMIN" | "MEMBER" | "GUEST";

export const INVITE_ACCESS_OPTIONS: {
  value: InviteAccessLevel;
  label: string;
  description: string;
  plus?: boolean;
}[] = [
  {
    value: "full_access",
    label: "Full access",
    description: "Edit, suggest, comment, and share",
  },
  {
    value: "can_edit",
    label: "Can edit",
    description: "Edit, suggest, and comment",
    plus: true,
  },
  {
    value: "can_comment",
    label: "Can comment",
    description: "Suggest and comment",
  },
  {
    value: "can_view",
    label: "Can view",
    description: "View only",
  },
];

export function accessLevelToWorkspaceRole(
  level: InviteAccessLevel,
  scope: InviteScope
): WorkspaceInviteRole {
  if (scope === "page") return "GUEST";
  switch (level) {
    case "full_access":
      return "ADMIN";
    case "can_edit":
      return "MEMBER";
    case "can_comment":
    case "can_view":
      return "GUEST";
  }
}

export function accessLevelToPagePermission(
  level: InviteAccessLevel
): PagePermissionLevel {
  switch (level) {
    case "full_access":
      return "full";
    case "can_edit":
      return "edit";
    case "can_comment":
      return "comment";
    case "can_view":
      return "view";
  }
}

export function accessLevelLabel(level: InviteAccessLevel): string {
  return (
    INVITE_ACCESS_OPTIONS.find((o) => o.value === level)?.label ?? "Full access"
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** Split raw input on commas / whitespace and normalize. */
export function parseEmailTokens(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

export function addEmailChip(
  emails: string[],
  raw: string
): { emails: string[]; error: string | null } {
  const tokens = parseEmailTokens(raw);
  if (tokens.length === 0) {
    return { emails, error: null };
  }

  const next = [...emails];
  for (const token of tokens) {
    if (!isValidEmail(token)) {
      return { emails, error: `"${token}" is not a valid email` };
    }
    if (next.includes(token)) {
      return { emails, error: `${token} is already added` };
    }
    next.push(token);
  }
  return { emails: next, error: null };
}
