-- 007_tasks_production.sql
-- Expand task lifecycle, media, watchers, dates, recurrence

-- Expand status enum (keep review temporarily for migration)
ALTER TABLE tbl_tasks
  MODIFY COLUMN status ENUM(
    'todo',
    'in_progress',
    'review',
    'blocked',
    'cancelled',
    'completed'
  ) NOT NULL DEFAULT 'todo';

UPDATE tbl_tasks SET status = 'in_progress' WHERE status = 'review';

ALTER TABLE tbl_tasks
  MODIFY COLUMN status ENUM(
    'todo',
    'in_progress',
    'blocked',
    'cancelled',
    'completed'
  ) NOT NULL DEFAULT 'todo';

ALTER TABLE tbl_tasks
  ADD COLUMN icon VARCHAR(64) NULL AFTER description,
  ADD COLUMN color VARCHAR(32) NULL AFTER icon,
  ADD COLUMN start_at DATETIME(3) NULL AFTER priority,
  ADD COLUMN follow_up_at DATETIME(3) NULL AFTER due_at,
  ADD COLUMN remind_at DATETIME(3) NULL AFTER follow_up_at,
  ADD COLUMN recurrence_rule VARCHAR(64) NULL AFTER remind_at;

ALTER TABLE tbl_tasks
  ADD KEY idx_tbl_tasks_ws_due (workspace_id, due_at),
  ADD KEY idx_tbl_tasks_ws_remind (workspace_id, remind_at);

CREATE TABLE IF NOT EXISTS tbl_task_attachments (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  task_id CHAR(26) NOT NULL,
  file_id CHAR(26) NOT NULL,
  created_by CHAR(26) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  UNIQUE KEY uq_tbl_task_attachments (task_id, file_id),
  KEY idx_tbl_task_attachments_ws (workspace_id, deleted_at),
  CONSTRAINT fk_tbl_task_attachments_ws FOREIGN KEY (workspace_id) REFERENCES tbl_workspaces (id),
  CONSTRAINT fk_tbl_task_attachments_task FOREIGN KEY (task_id) REFERENCES tbl_tasks (id),
  CONSTRAINT fk_tbl_task_attachments_file FOREIGN KEY (file_id) REFERENCES tbl_files (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_task_watchers (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  task_id CHAR(26) NOT NULL,
  user_id CHAR(26) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_tbl_task_watchers (task_id, user_id),
  KEY idx_tbl_task_watchers_user (user_id),
  CONSTRAINT fk_tbl_task_watchers_ws FOREIGN KEY (workspace_id) REFERENCES tbl_workspaces (id),
  CONSTRAINT fk_tbl_task_watchers_task FOREIGN KEY (task_id) REFERENCES tbl_tasks (id),
  CONSTRAINT fk_tbl_task_watchers_user FOREIGN KEY (user_id) REFERENCES tbl_users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE tbl_activity_logs
  ADD KEY idx_tbl_activity_resource (resource_type, resource_id, created_at);
