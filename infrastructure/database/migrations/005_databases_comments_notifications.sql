-- 005_databases_comments_notifications.sql

CREATE TABLE IF NOT EXISTS tbl_databases (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  page_id CHAR(26) NULL,
  name VARCHAR(180) NOT NULL,
  description TEXT NULL,
  created_by CHAR(26) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  KEY idx_tbl_databases_ws (workspace_id, deleted_at),
  CONSTRAINT fk_tbl_databases_ws FOREIGN KEY (workspace_id) REFERENCES tbl_workspaces (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_database_properties (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  database_id CHAR(26) NOT NULL,
  name VARCHAR(120) NOT NULL,
  type ENUM('text','number','select','multi_select','checkbox','date','person','url','relation') NOT NULL,
  config JSON NULL,
  sort_order VARCHAR(64) NOT NULL DEFAULT 'a0',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  KEY idx_tbl_database_properties_db (database_id, sort_order),
  CONSTRAINT fk_tbl_database_properties_db FOREIGN KEY (database_id) REFERENCES tbl_databases (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_database_rows (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  database_id CHAR(26) NOT NULL,
  sort_order VARCHAR(64) NOT NULL DEFAULT 'a0',
  created_by CHAR(26) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  KEY idx_tbl_database_rows_db (database_id, sort_order),
  CONSTRAINT fk_tbl_database_rows_db FOREIGN KEY (database_id) REFERENCES tbl_databases (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_database_cells (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  row_id CHAR(26) NOT NULL,
  property_id CHAR(26) NOT NULL,
  value_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_tbl_database_cells (row_id, property_id),
  CONSTRAINT fk_tbl_database_cells_row FOREIGN KEY (row_id) REFERENCES tbl_database_rows (id),
  CONSTRAINT fk_tbl_database_cells_prop FOREIGN KEY (property_id) REFERENCES tbl_database_properties (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_database_views (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  database_id CHAR(26) NOT NULL,
  name VARCHAR(120) NOT NULL,
  type ENUM('table','board','list','calendar') NOT NULL DEFAULT 'table',
  config JSON NULL,
  sort_order VARCHAR(64) NOT NULL DEFAULT 'a0',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  KEY idx_tbl_database_views_db (database_id),
  CONSTRAINT fk_tbl_database_views_db FOREIGN KEY (database_id) REFERENCES tbl_databases (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_comments (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  target_type ENUM('page','task','block') NOT NULL,
  target_id CHAR(26) NOT NULL,
  author_user_id CHAR(26) NOT NULL,
  body TEXT NOT NULL,
  mentions_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  KEY idx_tbl_comments_target (workspace_id, target_type, target_id, created_at),
  CONSTRAINT fk_tbl_comments_ws FOREIGN KEY (workspace_id) REFERENCES tbl_workspaces (id),
  CONSTRAINT fk_tbl_comments_author FOREIGN KEY (author_user_id) REFERENCES tbl_users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_notifications (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NULL,
  user_id CHAR(26) NOT NULL,
  type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NULL,
  resource_type VARCHAR(64) NULL,
  resource_id CHAR(26) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  read_at DATETIME(3) NULL,
  KEY idx_tbl_notifications_user (user_id, is_read, created_at),
  KEY idx_tbl_notifications_ws (workspace_id),
  CONSTRAINT fk_tbl_notifications_user FOREIGN KEY (user_id) REFERENCES tbl_users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
