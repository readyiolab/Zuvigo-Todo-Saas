-- 011_invitation_metadata.sql
-- Store page-scoped invite grants until the invitee accepts

ALTER TABLE tbl_workspace_invitations
  ADD COLUMN metadata JSON NULL AFTER accepted_at;
