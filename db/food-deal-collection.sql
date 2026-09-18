ALTER TABLE food_deals ADD COLUMN IF NOT EXISTS original_price integer;
ALTER TABLE food_deals ADD COLUMN IF NOT EXISTS discount_rate numeric(5,2);
ALTER TABLE food_deals ADD COLUMN IF NOT EXISTS collection_source text;
ALTER TABLE food_deals ADD COLUMN IF NOT EXISTS deal_category text NOT NULL DEFAULT 'other';
CREATE TABLE IF NOT EXISTS food_deal_collection_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), enabled boolean NOT NULL DEFAULT true
);
INSERT INTO food_deal_collection_settings(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS food_deal_collection_runs (
 id uuid PRIMARY KEY, trigger text NOT NULL, status text NOT NULL DEFAULT 'running',
 started_at timestamptz NOT NULL DEFAULT now(), heartbeat_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
 scanned integer NOT NULL DEFAULT 0, published integer NOT NULL DEFAULT 0, ended integer NOT NULL DEFAULT 0,
 skipped integer NOT NULL DEFAULT 0, errors integer NOT NULL DEFAULT 0, message text
);
CREATE TABLE IF NOT EXISTS food_deal_candidates (
 url text PRIMARY KEY, last_checked_at timestamptz, last_result text
);
ALTER TABLE food_deal_collection_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_deal_collection_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_deal_candidates ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS food_deal_candidates_checked ON food_deal_candidates(last_checked_at NULLS FIRST);
