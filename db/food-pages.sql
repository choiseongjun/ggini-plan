-- 음식 영양 검색 페이지(/kcal/[slug]) 주소표. 같은 이름(브랜드별)은 1회 제공량이 가장 큰 행 하나만 대표로 둔다.
-- scripts/build-food-pages.ts가 food_reference에서 다시 만든다.
CREATE TABLE IF NOT EXISTS food_pages (
  slug TEXT PRIMARY KEY,
  food_code TEXT NOT NULL REFERENCES food_reference(food_code) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  kcal NUMERIC,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS food_pages_category_idx ON food_pages(category);
-- 칼로리 페이지의 '같은 브랜드 메뉴'·'같은 분류 일반 음식' 목록(크롤러가 계속 연다).
CREATE INDEX IF NOT EXISTS food_pages_brand_idx ON food_pages(brand) WHERE brand IS NOT NULL;
CREATE INDEX IF NOT EXISTS food_pages_category_generic_idx ON food_pages(category, kcal) WHERE brand IS NULL;
