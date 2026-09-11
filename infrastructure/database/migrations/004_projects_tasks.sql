-- 004_projects_tasks.sql

CREATE TABLE IF NOT EXISTS tbl_projects (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  name VARCHAR(180) NOT NULL,
  description TEXT NULL,
  status ENUM('planned', 'active', 'on_hold', 'completed', 'archived') NOT NULL DEFAULT 'planned',
  start_date DATE NULL,
  due_date DATE NULL,
  created_by CHAR(26) NOT NULL,
  sort_order VARCHAR(64) NOT NULL DEFAULT 'a0',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  KEY idx_tbl_projects_ws (workspace_id, deleted_at, status),
  CONSTRAINT fk_tbl_projects_ws FOREIGN KEY (workspace_id) REFERENCES tbl_workspaces (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_tasks (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  project_id CHAR(26) NULL,
  parent_task_id CHAR(26) NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status ENUM('todo', 'in_progress', 'review', 'completed') NOT NULL DEFAULT 'todo',
  priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  due_at DATETIME(3) NULL,
  sort_order VARCHAR(64) NOT NULL DEFAULT 'a0',
  created_by CHAR(26) NOT NULL,
  completed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  KEY idx_tbl_tasks_ws_status (workspace_id, status, due_at),
  KEY idx_tbl_tasks_project (project_id, status, sort_order),
  KEY idx_tbl_tasks_parent (parent_task_id),
  CONSTRAINT fk_tbl_tasks_ws FOREIGN KEY (workspace_id) REFERENCES tbl_workspaces (id),
  CONSTRAINT fk_tbl_tasks_project FOREIGN KEY (project_id) REFERENCES tbl_projects (id),
  CONSTRAINT fk_tbl_tasks_parent FOREIGN KEY (parent_task_id) REFERENCES tbl_tasks (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_task_assignees (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  task_id CHAR(26) NOT NULL,
  user_id CHAR(26) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_tbl_task_assignees (task_id, user_id),
  KEY idx_tbl_task_assignees_user (user_id),
  CONSTRAINT fk_tbl_task_assignees_task FOREIGN KEY (task_id) REFERENCES tbl_tasks (id),
  CONSTRAINT fk_tbl_task_assignees_user FOREIGN KEY (user_id) REFERENCES tbl_users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_tags (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  name VARCHAR(64) NOT NULL,
  color VARCHAR(32) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_tbl_tags_ws_name (workspace_id, name),
  CONSTRAINT fk_tbl_tags_ws FOREIGN KEY (workspace_id) REFERENCES tbl_workspaces (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_task_tags (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  task_id CHAR(26) NOT NULL,
  tag_id CHAR(26) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_tbl_task_tags (task_id, tag_id),
  CONSTRAINT fk_tbl_task_tags_task FOREIGN KEY (task_id) REFERENCES tbl_tasks (id),
  CONSTRAINT fk_tbl_task_tags_tag FOREIGN KEY (tag_id) REFERENCES tbl_tags (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
