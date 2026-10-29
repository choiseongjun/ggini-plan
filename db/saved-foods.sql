CREATE TABLE IF NOT EXISTS saved_foods (
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 food_code TEXT NOT NULL REFERENCES food_reference(food_code) ON DELETE CASCADE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(user_id,food_code)
);
CREATE INDEX IF NOT EXISTS saved_foods_owner_date_idx ON saved_foods(user_id,created_at DESC);
