CREATE TABLE IF NOT EXISTS catalog_source_details (
 product_id TEXT PRIMARY KEY REFERENCES catalog_items(id) ON DELETE CASCADE,
 seller_name TEXT NOT NULL,
 category_path TEXT[] NOT NULL DEFAULT '{}',
 pack_label TEXT NOT NULL,
 source_url TEXT NOT NULL CHECK(source_url ~ '^https://'),
 checked_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE catalog_source_details ENABLE ROW LEVEL SECURITY;
