import assert from "node:assert/strict";
import {
  isTaskStatus,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
} from "../modules/tasks/task.types";
import {
  isAllowedUploadMime,
  MAX_UPLOAD_BYTES,
} from "../modules/files/file.service";

function testTaskStatuses() {
  assert.deepEqual(TASK_STATUSES, [
    "todo",
    "in_progress",
    "blocked",
    "cancelled",
    "completed",
  ]);
  assert.equal(isTaskStatus("review"), false);
  assert.equal(isTaskStatus("blocked"), true);
  assert.equal(TASK_STATUS_LABELS.todo, "Not started");
  assert.equal(TASK_STATUS_LABELS.blocked, "Stuck");
  assert.equal(TASK_STATUS_LABELS.cancelled, "Cancelled");
  assert.equal(TASK_STATUS_LABELS.completed, "Done");
}

function testMimeAllowlist() {
  assert.equal(isAllowedUploadMime("video/mp4"), true);
  assert.equal(isAllowedUploadMime("video/webm"), true);
  assert.equal(isAllowedUploadMime("image/png"), true);
  assert.equal(isAllowedUploadMime("application/x-msdownload"), false);
  assert.equal(MAX_UPLOAD_BYTES, 100 * 1024 * 1024);
}

testTaskStatuses();
testMimeAllowlist();
console.log("ok: tasks smoke tests passed");
