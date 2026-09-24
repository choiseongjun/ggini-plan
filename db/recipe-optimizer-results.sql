-- Every recipe the optimizer generates (lib/recipe-optimizer.ts) is saved here so the admin page
-- can list everything produced so far, not just the last run. This is also the sole source behind
-- the live home recommendation engine (lib/recipe-optimizer-plan.ts governmentOptimizedRecipeProducts).
CREATE TABLE IF NOT EXISTS recipe_optimizer_results (
  food_code TEXT PRIMARY KEY,
  target_name TEXT NOT NULL,
  template_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  total_grams NUMERIC(10, 2) NOT NULL,
  ingredients JSONB NOT NULL,
  target JSONB NOT NULL,
  predicted JSONB NOT NULL,
  error JSONB NOT NULL,
  score NUMERIC(10, 4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Distinguishes "순대볶음" (100g-basis dish) from a same-named but different (100ml-basis) dish —
-- the government snapshot keeps these as separate rows on purpose (see foodsafety-processed-nutrition.sql).
ALTER TABLE recipe_optimizer_results ADD COLUMN IF NOT EXISTS target_basis_amount TEXT NOT NULL DEFAULT '100g';
-- A real food photo for the dish, backfilled by scripts/import-recipe-images.mjs via Kakao's Daum
-- Image Search (there is no real product behind these synthetic recipes to photograph). NULL until backfilled.
ALTER TABLE recipe_optimizer_results ADD COLUMN IF NOT EXISTS image_url TEXT;
-- A GPT-composed realistic ingredient list (name/grams/per-100g nutrition/pack size+price, each
-- self-estimated by the model), backfilled by scripts/synthesize-ai-ingredients.mjs. The deterministic
-- optimizer above is constrained to ~26 generic raw ingredients and can't represent what a specific
-- dish actually needs (a meatball needs egg/breadcrumbs as a binder; nothing in that palette does).
-- When present, lib/recipe-optimizer-plan.ts uses this instead of `ingredients` for the main dish.
ALTER TABLE recipe_optimizer_results ADD COLUMN IF NOT EXISTS ai_ingredients JSONB;
-- Several candidate photos for the same dish (index 0 mirrors image_url above) so the UI can show a
-- gallery instead of trusting a single search hit to be the right one.
ALTER TABLE recipe_optimizer_results ADD COLUMN IF NOT EXISTS image_urls JSONB;
-- 어디서 온 메뉴인지: optimizer(정부DB 템플릿 자동 생성) / gov-expansion(정부DB 남은 식사류, GPT 재료) /
-- ai-expansion(GPT가 고른 인기 메뉴, 영양도 AI 추정). 관리자 "일괄 생성"의 정리(삭제)는 optimizer 행에만 적용한다.
ALTER TABLE recipe_optimizer_results ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'optimizer';
