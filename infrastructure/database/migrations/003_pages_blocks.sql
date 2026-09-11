-- 003_pages_blocks.sql
-- DnD-ready: parent_id + sort_order on pages; parent_block_id + sort_order + version on blocks

CREATE TABLE IF NOT EXISTS tbl_pages (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  parent_id CHAR(26) NULL,
  title VARCHAR(255) NOT NULL DEFAULT 'Untitled',
  icon VARCHAR(64) NULL,
  cover_file_id CHAR(26) NULL,
  sort_order VARCHAR(64) NOT NULL DEFAULT 'a0',
  is_archived TINYINT(1) NOT NULL DEFAULT 0,
  created_by CHAR(26) NOT NULL,
  updated_by CHAR(26) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  KEY idx_tbl_pages_ws_parent (workspace_id, parent_id, sort_order),
  KEY idx_tbl_pages_ws_deleted (workspace_id, deleted_at),
  CONSTRAINT fk_tbl_pages_ws FOREIGN KEY (workspace_id) REFERENCES tbl_workspaces (id),
  CONSTRAINT fk_tbl_pages_parent FOREIGN KEY (parent_id) REFERENCES tbl_pages (id),
  CONSTRAINT fk_tbl_pages_cover FOREIGN KEY (cover_file_id) REFERENCES tbl_files (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_page_blocks (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  page_id CHAR(26) NOT NULL,
  parent_block_id CHAR(26) NULL,
  type VARCHAR(64) NOT NULL,
  content JSON NOT NULL,
  sort_order VARCHAR(64) NOT NULL DEFAULT 'a0',
  version INT NOT NULL DEFAULT 1,
  created_by CHAR(26) NOT NULL,
  updated_by CHAR(26) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  KEY idx_tbl_page_blocks_page (page_id, parent_block_id, sort_order),
  KEY idx_tbl_page_blocks_ws (workspace_id, deleted_at),
  CONSTRAINT fk_tbl_page_blocks_ws FOREIGN KEY (workspace_id) REFERENCES tbl_workspaces (id),
  CONSTRAINT fk_tbl_page_blocks_page FOREIGN KEY (page_id) REFERENCES tbl_pages (id),
  CONSTRAINT fk_tbl_page_blocks_parent FOREIGN KEY (parent_block_id) REFERENCES tbl_page_blocks (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_page_favorites (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  page_id CHAR(26) NOT NULL,
  user_id CHAR(26) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_tbl_page_favorites (user_id, page_id),
  KEY idx_tbl_page_favorites_ws (workspace_id),
  CONSTRAINT fk_tbl_page_favorites_page FOREIGN KEY (page_id) REFERENCES tbl_pages (id),
  CONSTRAINT fk_tbl_page_favorites_user FOREIGN KEY (user_id) REFERENCES tbl_users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_page_permissions (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  page_id CHAR(26) NOT NULL,
  subject_type ENUM('user', 'role') NOT NULL,
  subject_id VARCHAR(64) NOT NULL,
  permission ENUM('view', 'comment', 'edit', 'full') NOT NULL DEFAULT 'view',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_tbl_page_permissions (page_id, subject_type, subject_id),
  KEY idx_tbl_page_permissions_ws (workspace_id),
  CONSTRAINT fk_tbl_page_permissions_page FOREIGN KEY (page_id) REFERENCES tbl_pages (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
