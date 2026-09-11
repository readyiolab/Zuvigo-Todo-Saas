-- Comment attachments + file cleanup support

CREATE TABLE IF NOT EXISTS tbl_comment_attachments (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  comment_id CHAR(26) NOT NULL,
  file_id CHAR(26) NOT NULL,
  created_by CHAR(26) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  UNIQUE KEY uq_comment_file (comment_id, file_id),
  KEY idx_comment_attachments_comment (comment_id, deleted_at),
  KEY idx_comment_attachments_workspace (workspace_id),
  CONSTRAINT fk_comment_attachments_ws FOREIGN KEY (workspace_id) REFERENCES tbl_workspaces (id) ON DELETE CASCADE,
  CONSTRAINT fk_comment_attachments_comment FOREIGN KEY (comment_id) REFERENCES tbl_comments (id) ON DELETE CASCADE,
  CONSTRAINT fk_comment_attachments_file FOREIGN KEY (file_id) REFERENCES tbl_files (id),
  CONSTRAINT fk_comment_attachments_user FOREIGN KEY (created_by) REFERENCES tbl_users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
