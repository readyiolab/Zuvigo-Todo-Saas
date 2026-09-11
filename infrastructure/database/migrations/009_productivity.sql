-- Productivity: duration, focus tracking, daily plans, notification prefs

ALTER TABLE tbl_tasks
  ADD COLUMN estimated_duration_minutes INT NULL AFTER completed_at,
  ADD COLUMN actual_duration_minutes INT NULL AFTER estimated_duration_minutes,
  ADD COLUMN focus_started_at DATETIME(3) NULL AFTER actual_duration_minutes;

CREATE INDEX idx_tasks_workspace_completed
  ON tbl_tasks (workspace_id, completed_at);

CREATE TABLE IF NOT EXISTS tbl_daily_plans (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  workspace_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  plan_date DATE NOT NULL,
  slots JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_daily_plan_user_date (workspace_id, user_id, plan_date),
  KEY idx_daily_plans_user (user_id),
  CONSTRAINT fk_daily_plans_workspace FOREIGN KEY (workspace_id) REFERENCES tbl_workspaces (id) ON DELETE CASCADE,
  CONSTRAINT fk_daily_plans_user FOREIGN KEY (user_id) REFERENCES tbl_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_notification_prefs (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  workspace_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  prefs JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_notif_prefs_user (workspace_id, user_id),
  CONSTRAINT fk_notif_prefs_workspace FOREIGN KEY (workspace_id) REFERENCES tbl_workspaces (id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_prefs_user FOREIGN KEY (user_id) REFERENCES tbl_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
