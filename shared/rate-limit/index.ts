import { ensureRedisConnected } from "@/infrastructure/redis/client";
import { AppError, rateLimitError } from "@/shared/errors";

type MemoryBucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, MemoryBucket>();

function assertMemoryRateLimit(options: {
  key: string;
  limit: number;
  windowSeconds: number;
}): void {
  const now = Date.now();
  const existing = memoryBuckets.get(options.key);
  if (!existing || existing.resetAt <= now) {
    memoryBuckets.set(options.key, {
      count: 1,
      resetAt: now + options.windowSeconds * 1000,
    });
    return;
  }
  existing.count += 1;
  if (existing.count > options.limit) {
    throw rateLimitError();
  }
}

/** Periodically prune expired in-memory buckets (dev / single-instance fallback). */
function pruneMemoryBuckets() {
  const now = Date.now();
  for (const [key, bucket] of memoryBuckets) {
    if (bucket.resetAt <= now) memoryBuckets.delete(key);
  }
}

if (typeof setInterval !== "undefined") {
  setInterval(pruneMemoryBuckets, 60_000).unref?.();
}

export async function assertRateLimit(options: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<void> {
  const { key, limit, windowSeconds } = options;
  const redisKey = `ratelimit:${key}`;

  try {
    const redis = await ensureRedisConnected();
    if (!redis) {
      assertMemoryRateLimit(options);
      return;
    }

    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }
    if (count > limit) {
      throw rateLimitError();
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    // Redis errored — fall back to in-memory limits for this process
    assertMemoryRateLimit(options);
  }
}
