import { Queue } from "bullmq";
import { getEnv } from "@/shared/env";
import { logger } from "@/shared/logger";

export const QUEUE_NAMES = {
  default: "zuvigo-default",
} as const;

let defaultQueue: Queue | null = null;

function connectionFromUrl() {
  const url = new URL(getEnv().REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    username: url.username || undefined,
    maxRetriesPerRequest: null as null,
  };
}

export function getDefaultQueue(): Queue {
  if (defaultQueue) return defaultQueue;
  defaultQueue = new Queue(QUEUE_NAMES.default, {
    connection: connectionFromUrl(),
    defaultJobOptions: {
      attempts: 4,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  });
  return defaultQueue;
}

export type JobName =
  | "send-email"
  | "invitation"
  | "file-cleanup"
  | "task.reminder"
  | "task.overdue-scan";

export async function enqueueJob(
  name: JobName,
  data: Record<string, unknown>,
  opts?: { jobId?: string; delay?: number }
) {
  try {
    if (!getEnv().REDIS_URL?.trim()) {
      logger.info("enqueue_job_skipped_no_redis", { name });
      return;
    }
    const queue = getDefaultQueue();
    await queue.add(name, data, {
      jobId: opts?.jobId,
      delay: opts?.delay,
    });
  } catch (error) {
    logger.warn("enqueue_job_failed", {
      name,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
