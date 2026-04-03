-- Add updated_at column and trigger to managed_instances
ALTER TABLE managed_instances ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'));

-- D1 doesn't support triggers, so updated_at must be set by application code.
-- Update existing rows to set updated_at = created_at
UPDATE managed_instances SET updated_at = created_at WHERE updated_at IS NULL;
