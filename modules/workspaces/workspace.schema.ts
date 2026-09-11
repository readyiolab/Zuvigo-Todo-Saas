import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  icon: z.string().trim().max(64).optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  icon: z.string().trim().max(64).nullable().optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().email().max(255),
  role: z.enum(["ADMIN", "MEMBER", "GUEST"]).default("MEMBER"),
});

export const updateMemberRoleSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(["ADMIN", "MEMBER", "GUEST"]),
});
