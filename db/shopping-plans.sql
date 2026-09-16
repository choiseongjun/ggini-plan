CREATE TABLE IF NOT EXISTS shopping_plans (
 id BIGSERIAL PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 conditions JSONB NOT NULL,
 meal_ids JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS shopping_plans_user_idx ON shopping_plans(user_id,id DESC);
