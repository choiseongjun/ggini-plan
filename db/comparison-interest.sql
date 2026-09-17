CREATE TABLE IF NOT EXISTS comparison_interest (
  product_id TEXT NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  event_day DATE NOT NULL,
  visitor_hash TEXT NOT NULL,
  PRIMARY KEY (event_day, visitor_hash, product_id)
);
CREATE INDEX IF NOT EXISTS comparison_interest_product_day ON comparison_interest(product_id,event_day);
ALTER TABLE comparison_interest ENABLE ROW LEVEL SECURITY;
