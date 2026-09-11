-- 002_files_subscriptions.sql

CREATE TABLE IF NOT EXISTS tbl_files (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  uploaded_by CHAR(26) NOT NULL,
  storage_provider ENUM('do_spaces') NOT NULL DEFAULT 'do_spaces',
  bucket VARCHAR(128) NOT NULL,
  object_key VARCHAR(512) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(128) NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  checksum VARCHAR(128) NULL,
  status ENUM('pending', 'ready', 'failed', 'deleted') NOT NULL DEFAULT 'pending',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  KEY idx_tbl_files_ws (workspace_id, deleted_at),
  KEY idx_tbl_files_status (status),
  UNIQUE KEY uq_tbl_files_object_key (object_key),
  CONSTRAINT fk_tbl_files_ws FOREIGN KEY (workspace_id) REFERENCES tbl_workspaces (id),
  CONSTRAINT fk_tbl_files_user FOREIGN KEY (uploaded_by) REFERENCES tbl_users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_subscriptions (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  stripe_customer_id VARCHAR(128) NULL,
  stripe_subscription_id VARCHAR(128) NULL,
  plan ENUM('free', 'pro', 'business', 'enterprise') NOT NULL DEFAULT 'free',
  status ENUM('active', 'trialing', 'past_due', 'canceled', 'incomplete') NOT NULL DEFAULT 'active',
  current_period_end DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  UNIQUE KEY uq_tbl_subscriptions_ws (workspace_id),
  CONSTRAINT fk_tbl_subscriptions_ws FOREIGN KEY (workspace_id) REFERENCES tbl_workspaces (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
