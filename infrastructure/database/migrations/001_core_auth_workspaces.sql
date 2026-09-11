-- 001_core_auth_workspaces.sql
-- Core users, sessions, workspaces, members, invitations, activity

CREATE TABLE IF NOT EXISTS tbl_users (
  id CHAR(26) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(120) NOT NULL,
  avatar_url VARCHAR(512) NULL,
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  email_verified_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  UNIQUE KEY uq_tbl_users_email (email),
  KEY idx_tbl_users_status (status),
  KEY idx_tbl_users_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_sessions (
  id CHAR(26) NOT NULL PRIMARY KEY,
  user_id CHAR(26) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  user_agent VARCHAR(512) NULL,
  ip_address VARCHAR(64) NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_tbl_sessions_token_hash (token_hash),
  KEY idx_tbl_sessions_user (user_id),
  KEY idx_tbl_sessions_expires (expires_at),
  CONSTRAINT fk_tbl_sessions_user FOREIGN KEY (user_id) REFERENCES tbl_users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_workspaces (
  id CHAR(26) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(64) NOT NULL,
  owner_user_id CHAR(26) NOT NULL,
  icon VARCHAR(64) NULL,
  status ENUM('active', 'archived') NOT NULL DEFAULT 'active',
  settings JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  UNIQUE KEY uq_tbl_workspaces_slug (slug),
  KEY idx_tbl_workspaces_owner (owner_user_id),
  KEY idx_tbl_workspaces_status (status, deleted_at),
  CONSTRAINT fk_tbl_workspaces_owner FOREIGN KEY (owner_user_id) REFERENCES tbl_users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_workspace_members (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  user_id CHAR(26) NOT NULL,
  role ENUM('OWNER', 'ADMIN', 'MEMBER', 'GUEST') NOT NULL DEFAULT 'MEMBER',
  status ENUM('active', 'invited', 'removed') NOT NULL DEFAULT 'active',
  invited_by CHAR(26) NULL,
  joined_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  UNIQUE KEY uq_tbl_workspace_members_ws_user (workspace_id, user_id),
  KEY idx_tbl_workspace_members_user (user_id, deleted_at),
  KEY idx_tbl_workspace_members_ws (workspace_id, deleted_at),
  CONSTRAINT fk_tbl_workspace_members_ws FOREIGN KEY (workspace_id) REFERENCES tbl_workspaces (id),
  CONSTRAINT fk_tbl_workspace_members_user FOREIGN KEY (user_id) REFERENCES tbl_users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_workspace_invitations (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'MEMBER', 'GUEST') NOT NULL DEFAULT 'MEMBER',
  token_hash CHAR(64) NOT NULL,
  status ENUM('pending', 'accepted', 'revoked', 'expired') NOT NULL DEFAULT 'pending',
  invited_by CHAR(26) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  accepted_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_tbl_workspace_invitations_token (token_hash),
  KEY idx_tbl_workspace_invitations_ws_email (workspace_id, email, status),
  CONSTRAINT fk_tbl_workspace_invitations_ws FOREIGN KEY (workspace_id) REFERENCES tbl_workspaces (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_activity_logs (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NULL,
  actor_user_id CHAR(26) NULL,
  action VARCHAR(64) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  resource_id CHAR(26) NULL,
  metadata JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_tbl_activity_logs_ws_created (workspace_id, created_at),
  KEY idx_tbl_activity_logs_actor (actor_user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_idempotency_keys (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NULL,
  user_id CHAR(26) NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  request_hash CHAR(64) NULL,
  response_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tbl_idempotency (user_id, idempotency_key),
  KEY idx_tbl_idempotency_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
