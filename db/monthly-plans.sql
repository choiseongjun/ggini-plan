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
