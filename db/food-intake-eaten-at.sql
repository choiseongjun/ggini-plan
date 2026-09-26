ALTER TABLE food_intake_logs ADD COLUMN IF NOT EXISTS eaten_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS food_intake_eaten_at_idx
 ON food_intake_logs(user_id, (COALESCE(eaten_at,created_at))) WHERE undone_at IS NULL;
