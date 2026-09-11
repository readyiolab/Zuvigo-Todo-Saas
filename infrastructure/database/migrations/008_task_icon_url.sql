-- Widen task icon to allow image URLs (emoji or uploaded picture).
ALTER TABLE tbl_tasks
  MODIFY COLUMN icon VARCHAR(512) NULL;
