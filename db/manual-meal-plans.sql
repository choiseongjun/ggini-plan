CREATE TABLE IF NOT EXISTS manual_meal_plans (
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 id UUID NOT NULL,
 name TEXT NOT NULL CHECK(char_length(name) BETWEEN 1 AND 80),
 day DATE NOT NULL,
 slot TEXT NOT NULL CHECK(slot IN ('breakfast','lunch','dinner','snack')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(user_id,id)
);
CREATE INDEX IF NOT EXISTS manual_meal_plans_day ON manual_meal_plans(user_id,day);
ALTER TABLE manual_meal_plans ENABLE ROW LEVEL SECURITY;
