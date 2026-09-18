-- Historical rows have no reliable registration timestamp. Keep them unknown.
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE catalog_items ALTER COLUMN created_at SET DEFAULT now();
CREATE INDEX IF NOT EXISTS catalog_items_created_at_idx ON catalog_items(created_at DESC NULLS LAST);
