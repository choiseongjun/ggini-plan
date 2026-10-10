-- Lossless nonempty source cells, including nutrients not exposed in the app yet.
-- Health supplements stay here only; never insert them into meal/product tables.
CREATE TABLE IF NOT EXISTS kfind_import_files (
 source_sha256 TEXT PRIMARY KEY,
 file_name TEXT NOT NULL,
 sheet_name TEXT NOT NULL,
 headers JSONB NOT NULL,
 expected_rows INTEGER NOT NULL CHECK (expected_rows > 0),
 completed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS kfind_nutrition_snapshots (
 source_sha256 TEXT NOT NULL REFERENCES kfind_import_files(source_sha256),
 food_code TEXT NOT NULL,
 food_type TEXT NOT NULL CHECK (food_type IN ('DISH','PROCESSED','SUPPLEMENT')),
 source_date DATE NOT NULL,
 raw_record JSONB NOT NULL,
 PRIMARY KEY (source_sha256, food_code)
);
CREATE INDEX IF NOT EXISTS kfind_nutrition_snapshots_code_date_idx
 ON kfind_nutrition_snapshots (food_code, source_date DESC);
CREATE OR REPLACE VIEW kfind_nutrition_latest AS
 SELECT DISTINCT ON (s.food_code) s.food_code, s.food_type, s.source_date,
 s.raw_record, s.source_sha256
 FROM kfind_nutrition_snapshots s JOIN kfind_import_files f USING (source_sha256)
 WHERE f.completed_at IS NOT NULL
 ORDER BY s.food_code, s.source_date DESC, s.source_sha256;
