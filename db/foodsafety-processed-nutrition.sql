-- Offline snapshot of 식약처 가공식품 품목별 영양성분DB (bulk .xlsx import), used as a local,
-- no-API-key fallback for matching packaged-food nutrition values in /admin/collect.
CREATE TABLE IF NOT EXISTS foodsafety_processed_nutrition (
  food_code TEXT PRIMARY KEY,
  item_name TEXT NOT NULL,
  representative_name TEXT NOT NULL,
  category_large TEXT,
  category_mid TEXT,
  category_small TEXT,
  basis_amount TEXT NOT NULL,
  calories_kcal NUMERIC(10, 2),
  protein_g NUMERIC(10, 2),
  fat_g NUMERIC(10, 2),
  carbohydrates_g NUMERIC(10, 2),
  sugar_g NUMERIC(10, 2),
  sodium_mg NUMERIC(10, 2),
  serving_size_note TEXT,
  source_name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS foodsafety_processed_nutrition_item_name_idx ON foodsafety_processed_nutrition (item_name);
-- Distinguishes the packaged-product snapshot ('가공식품') from the cooked/composed-dish snapshot ('음식') sharing this table.
ALTER TABLE foodsafety_processed_nutrition ADD COLUMN IF NOT EXISTS dataset_label TEXT NOT NULL DEFAULT '가공식품';

-- English-enum classification alongside dataset_label, matching how each row should be used:
-- RAW (원재료성식품) feeds recipe synthesis ingredients, PROCESSED (가공식품) feeds product/substitute
-- matching, DISH (음식) supplies target nutrition. Backfilled from the existing Korean labels.
ALTER TABLE foodsafety_processed_nutrition ADD COLUMN IF NOT EXISTS food_type TEXT CHECK (food_type IN ('RAW', 'PROCESSED', 'DISH'));
UPDATE foodsafety_processed_nutrition SET food_type = CASE dataset_label WHEN '원재료성식품' THEN 'RAW' WHEN '음식' THEN 'DISH' ELSE 'PROCESSED' END WHERE food_type IS NULL;

-- The raw gov snapshot records the same food name multiple times (separate survey samples), so browsing or
-- matching against the raw table shows confusing near-duplicates (e.g. "가래떡" three times with different values).
-- This view collapses same-name/same-dataset/same-basis rows into one averaged row. Same name across a different
-- basis_amount (100g vs 100ml) or dataset_label (packaged product vs cooked-dish estimate) stays separate on
-- purpose, since averaging across incompatible units or survey methods would produce a meaningless number.
CREATE OR REPLACE VIEW foodsafety_nutrition_canonical AS
SELECT
  MIN(food_code) AS food_code,
  item_name,
  mode() WITHIN GROUP (ORDER BY representative_name) AS representative_name,
  mode() WITHIN GROUP (ORDER BY category_large) AS category_large,
  mode() WITHIN GROUP (ORDER BY category_mid) AS category_mid,
  mode() WITHIN GROUP (ORDER BY category_small) AS category_small,
  dataset_label,
  basis_amount,
  ROUND(AVG(calories_kcal), 2) AS calories_kcal,
  ROUND(AVG(protein_g), 2) AS protein_g,
  ROUND(AVG(fat_g), 2) AS fat_g,
  ROUND(AVG(carbohydrates_g), 2) AS carbohydrates_g,
  ROUND(AVG(sugar_g), 2) AS sugar_g,
  ROUND(AVG(sodium_mg), 2) AS sodium_mg,
  count(*) AS sample_count,
  mode() WITHIN GROUP (ORDER BY food_type) AS food_type
FROM foodsafety_processed_nutrition
GROUP BY item_name, dataset_label, basis_amount;
