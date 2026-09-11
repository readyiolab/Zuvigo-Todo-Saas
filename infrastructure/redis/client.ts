import Redis from "ioredis";
import { getEnv, isRedisConfigured } from "@/shared/env";
import { logger } from "@/shared/logger";

let client: Redis | null = null;
let warnedDisabled = false;

export function isRedisReady(): boolean {
  return isRedisConfigured();
}

export function getRedis(): Redis | null {
  if (!isRedisConfigured()) {
    if (!warnedDisabled) {
      warnedDisabled = true;
      logger.info("redis_disabled", {
        message: "REDIS_URL not set — using MySQL-only sessions/cache until Upstash is configured",
      });
    }
    return null;
  }

  if (client) return client;

  const env = getEnv();
  client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy: () => null, // do not keep retrying when unavailable
  });

  client.on("error", (error) => {
    logger.warn("redis_error", { error: error.message });
  });

  return client;
}

export async function ensureRedisConnected(): Promise<Redis | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    if (redis.status === "wait" || redis.status === "end") {
      await redis.connect();
    }
    return redis;
  } catch (error) {
    logger.warn("redis_connect_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

export async function pingRedis(): Promise<boolean> {
  try {
    const redis = await ensureRedisConnected();
    if (!redis) return false;
    const result = await redis.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}
