CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS body_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  height DOUBLE PRECISION NOT NULL CHECK (height BETWEEN 100 AND 250),
  weight DOUBLE PRECISION NOT NULL CHECK (weight BETWEEN 30 AND 350),
  age INTEGER NOT NULL CHECK (age BETWEEN 19 AND 78),
  sex TEXT NOT NULL CHECK (sex IN ('female','male')),
  activity TEXT NOT NULL CHECK (activity IN ('sedentary','light','moderate','active')),
  meals INTEGER NOT NULL CHECK (meals BETWEEN 1 AND 6),
  pregnancy BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Google accounts do not have a local password. Existing password hashes remain intact.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

CREATE TABLE IF NOT EXISTS oauth_accounts (
  provider TEXT NOT NULL CHECK (provider = 'google'),
  provider_subject TEXT NOT NULL,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider, provider_subject),
  UNIQUE (user_id, provider)
);

CREATE TABLE IF NOT EXISTS oauth_login_attempts (
  state_hash CHAR(64) PRIMARY KEY,
  code_verifier TEXT NOT NULL,
  nonce TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS oauth_login_attempts_expires_idx ON oauth_login_attempts(expires_at);

CREATE TABLE IF NOT EXISTS catalog_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  detail TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  portions TEXT NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  search_query TEXT NOT NULL,
  product_url TEXT,
  nutrition_source_name TEXT,
  nutrition_source_url TEXT,
  nutrition_basis TEXT,
  calories_kcal NUMERIC(10, 2),
  protein_g NUMERIC(10, 2),
  carbohydrates_g NUMERIC(10, 2),
  fat_g NUMERIC(10, 2),
  sodium_mg NUMERIC(10, 2),
  nutrition_photo BYTEA,
  nutrition_photo_mime TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  CHECK (product_url IS NULL OR product_url ~ '^https://'),
  CHECK (nutrition_source_url IS NULL OR nutrition_source_url ~ '^https://'),
  CHECK (calories_kcal IS NULL OR calories_kcal >= 0),
  CHECK (protein_g IS NULL OR protein_g >= 0),
  CHECK (carbohydrates_g IS NULL OR carbohydrates_g >= 0),
  CHECK (fat_g IS NULL OR fat_g >= 0),
  CHECK (sodium_mg IS NULL OR sodium_mg >= 0)
);

ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS nutrition_photo BYTEA;
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS nutrition_photo_mime TEXT;

-- Verified manufacturer page for the base 210g rice item; price remains a planning estimate.
INSERT INTO catalog_items (id, name, detail, price, portions, quantity, search_query, product_url)
VALUES ('rice', '햇반 발아현미밥', '210g · 계획 수량 12개', 13900, '12끼', 2520, '햇반 발아현미밥 210g 12개', 'https://www.cjthemarket.com/the/product/product-main?prdCd=40119245')
ON CONFLICT (id) DO NOTHING;

-- K-FIND raw banana reference is per 100g edible portion, not per whole bunch.
INSERT INTO catalog_items (id, name, detail, price, portions, quantity, search_query, nutrition_source_name, nutrition_source_url, nutrition_basis, calories_kcal, protein_g, carbohydrates_g, fat_g, sodium_mg)
VALUES ('banana', '바나나', '약 1.5kg · 1송이', 8400, '약 10회', 1500, '바나나 1.5kg', '식약처 K-FIND · 바나나, 생것', 'https://various.foodsafetykorea.go.kr/nutrient/general/food/detail.do?searchFoodCd=R108-037000001-0000&searchMonthCd=AVG&searchRegionCd=ZZ', '가식부 100g당', 77, 1.11, 20, 0.20, 0)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE body_profiles ADD COLUMN IF NOT EXISTS diet_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS meal_plans (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_snapshot JSONB NOT NULL CHECK (jsonb_typeof(profile_snapshot) = 'object'),
  diet_snapshot JSONB NOT NULL CHECK (jsonb_typeof(diet_snapshot) = 'object'),
  recommendation JSONB NOT NULL CHECK (jsonb_typeof(recommendation) = 'object'),
  variant INTEGER NOT NULL DEFAULT 0 CHECK (variant BETWEEN 0 AND 1000000),
  algorithm_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS meal_plans_user_created_idx ON meal_plans(user_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS community_posts (
 id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 alias VARCHAR(24) NOT NULL, title VARCHAR(80) NOT NULL, body VARCHAR(1000) NOT NULL,
 items JSONB NOT NULL, style VARCHAR(20) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS community_posts_created_idx ON community_posts(created_at DESC);
CREATE TABLE IF NOT EXISTS community_likes (
 post_id BIGINT REFERENCES community_posts(id) ON DELETE CASCADE,
 user_id BIGINT REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(post_id,user_id)
);
CREATE TABLE IF NOT EXISTS community_tips (
 id BIGSERIAL PRIMARY KEY, post_id BIGINT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, alias VARCHAR(24) NOT NULL,
 body VARCHAR(500) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS community_tips_post_idx ON community_tips(post_id,created_at);
CREATE TABLE IF NOT EXISTS community_challenges (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, target INTEGER NOT NULL CHECK(target BETWEEN 1 AND 7)
);
INSERT INTO community_challenges VALUES
 ('home','이번 주 집밥 4번','하루 한 번, 직접 차린 한 끼를 기록해요.',4),
 ('delivery','배달 하루 쉬기','오늘은 배달 대신 준비한 식사를 먹어요.',1),
 ('leftover','남은 재료 비우기','냉장고 속 재료로 한 끼, 이번 주 두 번!',2)
 ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS challenge_members (
 user_id BIGINT REFERENCES users(id) ON DELETE CASCADE, challenge_id TEXT REFERENCES community_challenges(id),
 week_start DATE NOT NULL, PRIMARY KEY(user_id,challenge_id,week_start)
);
CREATE TABLE IF NOT EXISTS challenge_checks (
 user_id BIGINT REFERENCES users(id) ON DELETE CASCADE, challenge_id TEXT REFERENCES community_challenges(id),
 checked_on DATE NOT NULL, PRIMARY KEY(user_id,challenge_id,checked_on)
);
CREATE TABLE IF NOT EXISTS community_baskets (
 user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 source_post_id BIGINT REFERENCES community_posts(id) ON DELETE SET NULL,
 items JSONB NOT NULL, budget INTEGER NOT NULL CHECK(budget > 0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'g' CHECK(unit IN ('g','개'));
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS emoji TEXT NOT NULL DEFAULT '🥣';
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT 'mint';
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS price_checked_at TIMESTAMPTZ;
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS price_note TEXT;
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS allergens TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'ingredient' CHECK(category IN ('ingredient','meal_kit','frozen_meal','ready_meal','other'));
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS in_weekly_cart BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS product_image_url TEXT CHECK (product_image_url IS NULL OR product_image_url ~ '^https://');
INSERT INTO catalog_items (id,name,detail,price,portions,quantity,search_query,product_url,unit,emoji,color,category,in_weekly_cart,price_checked_at,price_note)
VALUES
 ('meal-kit-kimchi-stew','[마이셰프] 묵은지 김치찌개 밀키트','755g · 2인분',13950,'2끼',755,'마이셰프 묵은지 김치찌개 밀키트 755g','https://www.kurly.com/goods/1000136401','g','🍲','peach','meal_kit',FALSE,NOW(),'상품 페이지 표시 가격 · 배송비 별도'),
 ('frozen-shrimp-fried-rice','햇반 새우 볶음밥','420g · 냉동',4995,'약 2끼',420,'햇반 새우 볶음밥 420g','https://www.cjthemarket.com/the/product/product-main?prdCd=40164886','g','🍤','sand','frozen_meal',FALSE,NOW(),'상품 페이지 표시 가격 · 배송비 별도')
ON CONFLICT (id) DO NOTHING;
UPDATE catalog_items AS c SET product_image_url = v.image_url
FROM (VALUES
 ('banana','https://product-image.kurly.com/hdims/resize/%5E%3E720x%3E936/cropcenter/720x936/quality/85/src/product/image/79c0073f-129f-439b-935d-9b652073eb15.jpg'),
 ('chicken','https://product-image.kurly.com/hdims/resize/%5E%3E720x%3E936/cropcenter/720x936/quality/85/src/product/image/a9b6cda0-ddc6-497e-a8e5-4afa31af768c.jpg'),
 ('eggs','https://product-image.kurly.com/hdims/resize/%5E%3E720x%3E936/cropcenter/720x936/quality/85/src/product/image/08d74bf7-d39f-43d3-bd5b-67ae0e2b480c.jpg'),
 ('rice','https://img.cjthemarket.com/images/file/product/953/20260319183733031.jpg?RS=550&SF=webp'),
 ('tofu','https://img-cf.kurly.com/hdims/resize/%5E%3E720x%3E936/cropcenter/720x936/quality/85/src/shop/data/goods/164730389977l0.jpg'),
 ('meal-kit-kimchi-stew','https://product-image.kurly.com/hdims/resize/%5E%3E720x%3E936/cropcenter/720x936/quality/85/src/product/image/db00f366-d9c8-498c-b89d-caccb157167b.jpeg'),
 ('frozen-shrimp-fried-rice','https://img.cjthemarket.com/images/file/product/226/20260319131442498.jpg?RS=550&SF=webp')
) AS v(id,image_url)
WHERE c.id = v.id AND c.product_image_url IS NULL;
CREATE TABLE IF NOT EXISTS weekly_budgets (
 user_id BIGINT REFERENCES users(id) ON DELETE CASCADE, week_start DATE NOT NULL,
 amount INTEGER NOT NULL CHECK(amount BETWEEN 1 AND 10000000), PRIMARY KEY(user_id,week_start)
);
CREATE TABLE IF NOT EXISTS daily_expenses (
 user_id BIGINT REFERENCES users(id) ON DELETE CASCADE, spent_on DATE NOT NULL,
 category TEXT NOT NULL CHECK(category IN ('food','transport','household','other')),
 amount INTEGER NOT NULL CHECK(amount BETWEEN 0 AND 10000000),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id,spent_on,category)
);
CREATE INDEX IF NOT EXISTS daily_expenses_user_date_idx ON daily_expenses(user_id,spent_on);

ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS nutrition_photo_url TEXT CHECK (nutrition_photo_url IS NULL OR nutrition_photo_url ~ '^https://');
CREATE TABLE IF NOT EXISTS shopping_plans (
 id BIGSERIAL PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 conditions JSONB NOT NULL,
 meal_ids JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS shopping_plans_user_idx ON shopping_plans(user_id,id DESC);

CREATE TABLE IF NOT EXISTS monthly_budgets (
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 month_start DATE NOT NULL CHECK (EXTRACT(DAY FROM month_start)=1),
 amount INTEGER NOT NULL CHECK(amount BETWEEN 1 AND 10000000),
 PRIMARY KEY(user_id,month_start)
);

CREATE TABLE IF NOT EXISTS monthly_meal_plans (
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 month TEXT NOT NULL,
 profile JSONB NOT NULL,
 diet JSONB NOT NULL,
 days JSONB NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(user_id,month)
);
CREATE TABLE IF NOT EXISTS meal_ingredient_baskets (
 user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 month TEXT NOT NULL,
 start_date DATE NOT NULL,
 owned JSONB NOT NULL DEFAULT '[]',
 FOREIGN KEY(user_id,month) REFERENCES monthly_meal_plans(user_id,month) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shopping_preferences (
 user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 conditions JSONB NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
