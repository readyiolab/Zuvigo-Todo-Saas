import { Worker } from "bullmq";
import { QUEUE_NAMES } from "@/infrastructure/queue/client";
import { getEnv } from "@/shared/env";
import { logger } from "@/shared/logger";
import { insertNotification } from "@/modules/notifications/notification.service";
import { query, type RowDataPacket } from "@/infrastructure/database/connection";

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

async function handleTaskReminder(data: Record<string, unknown>) {
  const workspaceId = String(data.workspaceId ?? "");
  const taskId = String(data.taskId ?? "");
  if (!workspaceId || !taskId) return;

  type Row = RowDataPacket & {
    title: string;
    user_id: string;
  };
  const rows = await query<Row[]>(
    `SELECT t.title, a.user_id
     FROM tbl_tasks t
     INNER JOIN tbl_task_assignees a ON a.task_id = t.id
     WHERE t.id = :taskId
       AND t.workspace_id = :workspaceId
       AND t.deleted_at IS NULL
       AND t.status NOT IN ('completed', 'cancelled')`,
    { taskId, workspaceId }
  );

  for (const row of rows) {
    await insertNotification({
      workspaceId,
      userId: row.user_id,
      type: "task.due_soon",
      title: "Task reminder",
      body: row.title,
      resourceType: "task",
      resourceId: taskId,
    });
  }
}

async function handleOverdueScan() {
  type Row = RowDataPacket & {
    workspace_id: string;
    task_id: string;
    title: string;
    user_id: string;
  };
  const rows = await query<Row[]>(
    `SELECT t.workspace_id, t.id AS task_id, t.title, a.user_id
     FROM tbl_tasks t
     INNER JOIN tbl_task_assignees a ON a.task_id = t.id
     WHERE t.deleted_at IS NULL
       AND t.due_at IS NOT NULL
       AND t.due_at < NOW()
       AND t.status NOT IN ('completed', 'cancelled')
     LIMIT 500`
  );
  for (const row of rows) {
    await insertNotification({
      workspaceId: row.workspace_id,
      userId: row.user_id,
      type: "task.overdue",
      title: "Task is overdue",
      body: row.title,
      resourceType: "task",
      resourceId: row.task_id,
    });
  }
}

async function processJob(name: string, data: Record<string, unknown>) {
  switch (name) {
    case "send-email":
    case "invitation":
      logger.info("job_stub_processed", { name, data });
      return;
    case "file-cleanup": {
      const fileId = String(data.fileId ?? "");
      const workspaceId = String(data.workspaceId ?? "");
      if (fileId && workspaceId) {
        const { cleanupStaleFile } = await import(
          "@/modules/files/file.service"
        );
        await cleanupStaleFile(fileId, workspaceId);
      } else {
        const { cleanupOrphanPendingFiles } = await import(
          "@/modules/files/file.service"
        );
        const n = await cleanupOrphanPendingFiles(1);
        logger.info("job_file_cleanup_sweep", { cleaned: n });
      }
      return;
    }
    case "task.reminder":
      await handleTaskReminder(data);
      return;
    case "task.overdue-scan":
      await handleOverdueScan();
      return;
    default:
      logger.warn("job_unknown", { name });
  }
}

if (!getEnv().REDIS_URL?.trim()) {
  logger.info("worker_skipped_no_redis");
  process.exit(0);
}

const worker = new Worker(
  QUEUE_NAMES.default,
  async (job) => {
    await processJob(job.name, job.data as Record<string, unknown>);
  },
  { connection: connectionFromUrl() }
);

worker.on("failed", (job, error) => {
  logger.error("job_failed", {
    jobId: job?.id,
    name: job?.name,
    error: error instanceof Error ? error.message : "unknown",
  });
});

logger.info("worker_started", { queue: QUEUE_NAMES.default });
