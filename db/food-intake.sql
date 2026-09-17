CREATE TABLE IF NOT EXISTS food_intake_logs (
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 id UUID NOT NULL,
 product_id TEXT NOT NULL,
 product_name TEXT NOT NULL,
 portions NUMERIC NOT NULL CHECK(portions>0 AND portions<=10),
 packs NUMERIC NOT NULL CHECK(packs>0),
 calories NUMERIC CHECK(calories>=0),
 protein NUMERIC CHECK(protein>=0),
 stock_item JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 undone_at TIMESTAMPTZ,
 PRIMARY KEY(user_id,id)
);
CREATE INDEX IF NOT EXISTS food_intake_date_idx ON food_intake_logs(user_id,created_at DESC) WHERE undone_at IS NULL;
