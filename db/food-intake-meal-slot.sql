ALTER TABLE food_intake_logs ADD COLUMN IF NOT EXISTS meal_slot text CHECK (meal_slot IN ('breakfast','lunch','dinner','snack'));
ALTER TABLE food_intake_logs ADD COLUMN IF NOT EXISTS request_id uuid;
CREATE INDEX IF NOT EXISTS food_intake_request_idx ON food_intake_logs(user_id,request_id);
