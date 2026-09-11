import { ensureRedisConnected } from "@/infrastructure/redis/client";

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = await ensureRedisConnected();
    if (!redis) return null;
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  try {
    const redis = await ensureRedisConnected();
    if (!redis) return;
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // ignore
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    const redis = await ensureRedisConnected();
    if (!redis) return;
    await redis.del(...keys);
  } catch {
    // ignore
  }
}

export function workspaceCacheKey(workspaceId: string, suffix: string) {
  return `workspace:${workspaceId}:${suffix}`;
}

export function userCacheKey(userId: string, suffix: string) {
  return `user:${userId}:${suffix}`;
}
