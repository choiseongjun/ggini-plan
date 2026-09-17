-- Run after schema.sql. Transaction is owned by the migration runner.
CREATE TABLE IF NOT EXISTS currencies (
 code TEXT PRIMARY KEY CHECK(code ~ '^[A-Z]{3}$'),
 minor_units SMALLINT NOT NULL CHECK(minor_units BETWEEN 0 AND 4)
);
INSERT INTO currencies VALUES ('KRW',0),('JPY',0),('USD',2),('EUR',2) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS locales (
 code TEXT PRIMARY KEY, native_name TEXT NOT NULL
);
INSERT INTO locales VALUES ('ko-KR','한국어'),('ja-JP','日本語'),('en-US','English') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS markets (
 code TEXT PRIMARY KEY CHECK(code ~ '^[A-Z]{2}$'),
 name TEXT NOT NULL,
 currency_code TEXT NOT NULL REFERENCES currencies(code),
 default_locale TEXT NOT NULL REFERENCES locales(code),
 time_zone TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'preview' CHECK(status IN ('active','preview','disabled')),
 UNIQUE(code,currency_code)
);
INSERT INTO markets VALUES ('KR','대한민국','KRW','ko-KR','Asia/Seoul','active'),('JP','日本','JPY','ja-JP','Asia/Tokyo','preview') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS market_locales (
 market_code TEXT NOT NULL REFERENCES markets(code),locale_code TEXT NOT NULL REFERENCES locales(code),
 PRIMARY KEY(market_code,locale_code)
);
INSERT INTO market_locales VALUES ('KR','ko-KR'),('KR','ja-JP'),('KR','en-US'),('JP','ja-JP'),('JP','ko-KR'),('JP','en-US') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS user_regions (
 user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 market_code TEXT NOT NULL DEFAULT 'KR',locale_code TEXT NOT NULL DEFAULT 'ko-KR',
 time_zone TEXT NOT NULL DEFAULT 'Asia/Seoul',updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 FOREIGN KEY(market_code,locale_code) REFERENCES market_locales(market_code,locale_code)
);
CREATE TABLE IF NOT EXISTS market_sellers (
 market_code TEXT NOT NULL REFERENCES markets(code),seller_key TEXT NOT NULL,
 name TEXT NOT NULL,website_url TEXT NOT NULL CHECK(website_url ~ '^https://'),
 PRIMARY KEY(market_code,seller_key)
);
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS market_code TEXT NOT NULL DEFAULT 'KR' REFERENCES markets(code);
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'KRW' REFERENCES currencies(code);
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS source_locale TEXT NOT NULL DEFAULT 'ko-KR' REFERENCES locales(code);
CREATE TABLE IF NOT EXISTS catalog_translations (
 product_id TEXT NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
 locale_code TEXT NOT NULL REFERENCES locales(code),
 name TEXT NOT NULL,detail TEXT NOT NULL,portions TEXT NOT NULL,search_query TEXT NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(product_id,locale_code)
);
CREATE TABLE IF NOT EXISTS catalog_offers (
 id TEXT PRIMARY KEY,
 product_id TEXT NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
 market_code TEXT NOT NULL,currency_code TEXT NOT NULL,seller_key TEXT NOT NULL,
 seller_product_id TEXT NOT NULL,
 price_minor BIGINT NOT NULL CHECK(price_minor BETWEEN 0 AND 9007199254740991),
 shipping_minor BIGINT CHECK(shipping_minor BETWEEN 0 AND 9007199254740991),
 tax_included BOOLEAN,
 product_url TEXT NOT NULL CHECK(product_url ~ '^https://'),
 availability TEXT NOT NULL DEFAULT 'unknown' CHECK(availability IN ('in_stock','out_of_stock','unknown','discontinued')),
 checked_at TIMESTAMPTZ NOT NULL,source_url TEXT NOT NULL CHECK(source_url ~ '^https://'),
 FOREIGN KEY(market_code,currency_code) REFERENCES markets(code,currency_code),
 FOREIGN KEY(market_code,seller_key) REFERENCES market_sellers(market_code,seller_key),
 UNIQUE(market_code,seller_key,seller_product_id),
 UNIQUE(id,market_code,currency_code,product_id)
);
CREATE INDEX IF NOT EXISTS catalog_offers_market_idx ON catalog_offers(market_code,product_id,availability);
-- Backfill only prices with an actual check timestamp; do not invent availability.
INSERT INTO market_sellers(market_code,seller_key,name,website_url)
SELECT DISTINCT market_code,substring(product_url from '^https://([^/:]+)'),substring(product_url from '^https://([^/:]+)'), 'https://'||substring(product_url from '^https://([^/:]+)')
FROM catalog_items WHERE product_url ~ '^https://[^/:]+' AND price_checked_at IS NOT NULL
ON CONFLICT DO NOTHING;
INSERT INTO catalog_offers(id,product_id,market_code,currency_code,seller_key,seller_product_id,price_minor,product_url,checked_at,source_url)
SELECT 'legacy:'||id,id,market_code,currency_code,substring(product_url from '^https://([^/:]+)'),id,price,product_url,price_checked_at,product_url
FROM catalog_items WHERE product_url ~ '^https://[^/:]+' AND price_checked_at IS NOT NULL
ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS catalog_serving_profiles (
 product_id TEXT PRIMARY KEY REFERENCES catalog_items(id) ON DELETE CASCADE,
 servings NUMERIC(10,3) NOT NULL CHECK(servings>0),
 serving_grams NUMERIC(12,3) CHECK(serving_grams>0),
 nutrition_basis_grams NUMERIC(12,3) CHECK(nutrition_basis_grams>0),
 meal_slots TEXT[] NOT NULL CHECK(cardinality(meal_slots)>0 AND meal_slots <@ ARRAY['breakfast','lunch','dinner']::text[]),
 source_url TEXT NOT NULL CHECK(source_url ~ '^https://'),verified_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS food_ingredients (code TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS ingredient_translations (
 ingredient_code TEXT NOT NULL REFERENCES food_ingredients(code),locale_code TEXT NOT NULL REFERENCES locales(code),
 name TEXT NOT NULL,aliases TEXT[] NOT NULL DEFAULT '{}',PRIMARY KEY(ingredient_code,locale_code)
);
WITH labels(code,ko,ja) AS (VALUES
 ('chicken','닭고기','鶏肉'),('beef','소고기','牛肉'),('pork','돼지고기','豚肉'),('duck','오리고기','鴨肉'),
 ('fish','생선','魚'),('shrimp','새우','えび'),('crab','게','かに'),('squid','오징어','いか'),('shellfish','조개류','貝類'),
 ('egg','달걀','卵'),('milk','우유·유제품','乳製品'),('soy','콩·두부','大豆・豆腐'),('peanut','땅콩','落花生'),('nuts','견과류','ナッツ類'),('sesame','참깨','ごま'),
 ('corn','옥수수·콘시리얼','とうもろこし'),('wheat','밀','小麦'),('buckwheat','메밀','そば'),('oats','귀리·오트밀','オーツ麦'),('rice','쌀·밥','米・ご飯'),
 ('banana','바나나','バナナ'),('broccoli','브로콜리','ブロッコリー'),('mushroom','버섯','きのこ'),('onion','양파','玉ねぎ'),('garlic','마늘','にんにく'),('tomato','토마토','トマト'),('peach','복숭아','もも'),('sulfites','아황산류','亜硫酸塩')
), inserted AS (INSERT INTO food_ingredients SELECT code FROM labels ON CONFLICT DO NOTHING)
INSERT INTO ingredient_translations(ingredient_code,locale_code,name)
SELECT code,'ko-KR',ko FROM labels UNION ALL SELECT code,'ja-JP',ja FROM labels ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS catalog_allergen_evidence (
 product_id TEXT NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
 ingredient_code TEXT NOT NULL REFERENCES food_ingredients(code),
 status TEXT NOT NULL CHECK(status IN ('contains','may_contain','absent','unknown')),
 source_locale TEXT NOT NULL REFERENCES locales(code),statement TEXT NOT NULL,
 source_url TEXT NOT NULL CHECK(source_url ~ '^https://'),verified_at TIMESTAMPTZ NOT NULL,
 PRIMARY KEY(product_id,ingredient_code)
);

-- Historical amounts keep their original KRW meaning. No exchange-rate conversion.
DO $$
DECLARE t TEXT;
BEGIN
 FOREACH t IN ARRAY ARRAY['daily_expenses','weekly_budgets','monthly_budgets','shopping_expenses','food_intake_logs','shopping_plans','shared_shopping_plans','meal_plans','monthly_meal_plans','community_baskets'] LOOP
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS market_code TEXT NOT NULL DEFAULT ''KR'' REFERENCES markets(code)',t);
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT ''KRW'' REFERENCES currencies(code)',t);
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=t::regclass AND conname=t||'_market_currency_fk') THEN
   EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY(market_code,currency_code) REFERENCES markets(code,currency_code)',t,t||'_market_currency_fk');
  END IF;
 END LOOP;
 FOREACH t IN ARRAY ARRAY['food_intake_logs','shopping_plans','shared_shopping_plans','meal_plans','monthly_meal_plans'] LOOP
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS locale_code TEXT NOT NULL DEFAULT ''ko-KR'' REFERENCES locales(code)',t);
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS time_zone TEXT NOT NULL DEFAULT ''Asia/Seoul''',t);
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='catalog_items'::regclass AND conname='catalog_items_market_currency_fk') THEN
  ALTER TABLE catalog_items ADD CONSTRAINT catalog_items_market_currency_fk FOREIGN KEY(market_code,currency_code) REFERENCES markets(code,currency_code);
 END IF;
END $$;

-- A person can record both won and yen on the same local date.
ALTER TABLE daily_expenses DROP CONSTRAINT IF EXISTS daily_expenses_pkey;
ALTER TABLE daily_expenses ADD PRIMARY KEY(user_id,market_code,currency_code,spent_on,category);
ALTER TABLE weekly_budgets DROP CONSTRAINT IF EXISTS weekly_budgets_pkey;
ALTER TABLE weekly_budgets ADD PRIMARY KEY(user_id,market_code,currency_code,week_start);
ALTER TABLE monthly_budgets DROP CONSTRAINT IF EXISTS monthly_budgets_pkey;
ALTER TABLE monthly_budgets ADD PRIMARY KEY(user_id,market_code,currency_code,month_start);

-- A workspace is independent of display language and can coexist across markets.
CREATE TABLE IF NOT EXISTS market_workspaces (
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 market_code TEXT NOT NULL,currency_code TEXT NOT NULL,
 locale_code TEXT NOT NULL REFERENCES locales(code),time_zone TEXT NOT NULL,
 preferences JSONB NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(preferences)='object'),
 version INTEGER NOT NULL DEFAULT 0 CHECK(version>=0),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(user_id,market_code),UNIQUE(user_id,market_code,currency_code),
 FOREIGN KEY(market_code,currency_code) REFERENCES markets(code,currency_code),
 FOREIGN KEY(market_code,locale_code) REFERENCES market_locales(market_code,locale_code)
);
CREATE TABLE IF NOT EXISTS market_inventory (
 user_id BIGINT NOT NULL,market_code TEXT NOT NULL,
 product_id TEXT NOT NULL REFERENCES catalog_items(id),
 ordered_packs NUMERIC(16,6) NOT NULL DEFAULT 0 CHECK(ordered_packs>=0),
 owned_packs NUMERIC(16,6) NOT NULL DEFAULT 0 CHECK(owned_packs>=0),
 version INTEGER NOT NULL DEFAULT 0 CHECK(version>=0),
 PRIMARY KEY(user_id,market_code,product_id),
 FOREIGN KEY(user_id,market_code) REFERENCES market_workspaces(user_id,market_code) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS market_plan_meals (
 user_id BIGINT NOT NULL,market_code TEXT NOT NULL,currency_code TEXT NOT NULL,
 meal_date DATE NOT NULL,meal_slot TEXT NOT NULL CHECK(meal_slot IN ('breakfast','lunch','dinner')),
 product_id TEXT NOT NULL REFERENCES catalog_items(id),offer_id TEXT,
 portions NUMERIC(10,3) NOT NULL CHECK(portions>0),
 price_minor BIGINT CHECK(price_minor BETWEEN 0 AND 9007199254740991),
 snapshot JSONB NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(snapshot)='object'),
 PRIMARY KEY(user_id,market_code,meal_date,meal_slot),
 FOREIGN KEY(user_id,market_code,currency_code) REFERENCES market_workspaces(user_id,market_code,currency_code) ON DELETE CASCADE,
 FOREIGN KEY(offer_id,market_code,currency_code,product_id) REFERENCES catalog_offers(id,market_code,currency_code,product_id)
);
CREATE TABLE IF NOT EXISTS market_meal_intakes (
 user_id BIGINT NOT NULL,market_code TEXT NOT NULL,currency_code TEXT NOT NULL,id UUID NOT NULL,
 meal_date DATE NOT NULL,meal_slot TEXT NOT NULL CHECK(meal_slot IN ('breakfast','lunch','dinner','snack')),
 entry_kind TEXT NOT NULL DEFAULT 'main' CHECK(entry_kind IN ('main','additional')),
 product_id TEXT NOT NULL REFERENCES catalog_items(id),product_name TEXT NOT NULL,
 portions NUMERIC(10,3) NOT NULL CHECK(portions>0),
 calories NUMERIC CHECK(calories>=0),protein NUMERIC CHECK(protein>=0),
 estimated_cost_minor BIGINT CHECK(estimated_cost_minor BETWEEN 0 AND 9007199254740991),
 locale_code TEXT NOT NULL REFERENCES locales(code),time_zone TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),undone_at TIMESTAMPTZ,
 PRIMARY KEY(user_id,id),
 FOREIGN KEY(user_id,market_code,currency_code) REFERENCES market_workspaces(user_id,market_code,currency_code) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS market_intake_main_slot_idx ON market_meal_intakes(user_id,market_code,meal_date,meal_slot) WHERE entry_kind='main' AND undone_at IS NULL;
