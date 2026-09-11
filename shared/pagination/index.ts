import { z } from "zod";
import { validationError } from "@/shared/errors";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  cursor: z.string().optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export type PaginatedResult<T> = {
  data: T[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
};

export function parsePagination(input: unknown): PaginationInput {
  const result = paginationSchema.safeParse(input);
  if (!result.success) {
    throw validationError("Invalid pagination parameters", result.error.flatten());
  }
  return result.data;
}

export function buildPaginatedResult<T extends { id: string }>(
  rows: T[],
  limit: number
): PaginatedResult<T> {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;
  return {
    data,
    pagination: { nextCursor, hasMore },
  };
}
