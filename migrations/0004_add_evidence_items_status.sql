BEGIN;

ALTER TABLE evidence_items
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'UNKNOWN';

COMMIT;

-- Rollback (destructive; only before production data exists):
-- ALTER TABLE evidence_items DROP COLUMN status;
