-- 날짜별 체중 기록 (하루 1건, 같은 날 다시 입력하면 덮어쓴다).
CREATE TABLE IF NOT EXISTS weight_logs (
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 day DATE NOT NULL,
 weight_kg NUMERIC(5,1) NOT NULL CHECK (weight_kg >= 25 AND weight_kg <= 350),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY (user_id, day)
);
