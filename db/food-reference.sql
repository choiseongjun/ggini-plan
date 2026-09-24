-- 음식 영양 사전: 전국통합식품영양성분정보(음식) 원본 전체. 간식·디저트·음료·외식 기록에 쓴다.
-- 영양값은 basis_amount(100g/100mL) 기준, serving_amount는 1회 제공량(식품중량, 예: 473mL).
CREATE TABLE IF NOT EXISTS food_reference (
  food_code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  origin TEXT,
  basis_amount NUMERIC NOT NULL,
  basis_unit TEXT NOT NULL,
  serving_amount NUMERIC,
  serving_unit TEXT,
  calories_kcal NUMERIC,
  protein_g NUMERIC,
  fat_g NUMERIC,
  carbohydrates_g NUMERIC,
  sugar_g NUMERIC,
  sodium_mg NUMERIC,
  search_text TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS food_reference_category_idx ON food_reference(category);

-- 기록에 탄수화물·당류·나트륨·지방도 남긴다(오늘 먹은 양 반영, 당류 안내에 쓴다). 예전 기록은 NULL.
ALTER TABLE food_intake_logs ADD COLUMN IF NOT EXISTS carbs NUMERIC CHECK(carbs>=0);
ALTER TABLE food_intake_logs ADD COLUMN IF NOT EXISTS sugar NUMERIC CHECK(sugar>=0);
ALTER TABLE food_intake_logs ADD COLUMN IF NOT EXISTS sodium NUMERIC CHECK(sodium>=0);
ALTER TABLE food_intake_logs ADD COLUMN IF NOT EXISTS fat NUMERIC CHECK(fat>=0);
