-- 추천 결과 기록: 어떤 메뉴를 누구에게 추천했는지. 먹은 기록(food_intake_logs)과 이어서 메뉴별 "추천 → 먹음" 전환율을 본다.
-- 로그인 사용자만(먹은 기록과 연결할 수 없는 비회원은 남기지 않는다). 90일 지난 기록은 지운다.
CREATE TABLE IF NOT EXISTS plan_recommendations (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  slot TEXT NOT NULL,
  plan_date DATE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('recommend', 'swap')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS plan_recommendations_product_idx ON plan_recommendations(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS plan_recommendations_user_idx ON plan_recommendations(user_id, created_at DESC);
