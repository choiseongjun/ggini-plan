CREATE TABLE IF NOT EXISTS food_deals (
 id UUID PRIMARY KEY,
 title TEXT NOT NULL,
 food_type TEXT NOT NULL,
 source_name TEXT NOT NULL,
 source_url TEXT NOT NULL UNIQUE,
 product_url TEXT NOT NULL,
 price INTEGER NOT NULL CHECK(price>0),
 shipping INTEGER CHECK(shipping>=0),
 pack TEXT NOT NULL,
 conditions TEXT NOT NULL,
 product_id TEXT REFERENCES catalog_items(id) ON DELETE SET NULL,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','live','ended')),
 checked_at TIMESTAMPTZ,
 ends_at TIMESTAMPTZ,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(status<>'live' OR checked_at IS NOT NULL)
);
ALTER TABLE food_deals ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS food_deals_status_time ON food_deals(status,checked_at DESC);
