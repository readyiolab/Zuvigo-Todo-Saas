-- 006_page_visits_search.sql
-- Recent pages + title search index

CREATE TABLE IF NOT EXISTS tbl_page_visits (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  page_id CHAR(26) NOT NULL,
  user_id CHAR(26) NOT NULL,
  visited_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_tbl_page_visits_user_page (user_id, page_id),
  KEY idx_tbl_page_visits_user_ws (user_id, workspace_id, visited_at),
  CONSTRAINT fk_tbl_page_visits_ws FOREIGN KEY (workspace_id) REFERENCES tbl_workspaces (id),
  CONSTRAINT fk_tbl_page_visits_page FOREIGN KEY (page_id) REFERENCES tbl_pages (id),
  CONSTRAINT fk_tbl_page_visits_user FOREIGN KEY (user_id) REFERENCES tbl_users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
