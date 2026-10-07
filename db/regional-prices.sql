CREATE TABLE IF NOT EXISTS regional_price_snapshots (
 source text PRIMARY KEY CHECK (source IN ('kamis','tprice')),
 survey_date date NOT NULL,
 collected_at timestamptz NOT NULL,
 payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='array'),
 metadata jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE regional_price_snapshots ENABLE ROW LEVEL SECURITY;
