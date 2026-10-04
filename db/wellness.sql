CREATE TABLE IF NOT EXISTS wellness_settings (
 user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 water_enabled BOOLEAN NOT NULL DEFAULT TRUE,
 weight_enabled BOOLEAN NOT NULL DEFAULT TRUE,
 cup_ml INTEGER NOT NULL DEFAULT 200 CHECK(cup_ml BETWEEN 10 AND 2000),
 goal_ml INTEGER CHECK(goal_ml BETWEEN 100 AND 10000),
 version INTEGER NOT NULL DEFAULT 0,
 request_id UUID
);
CREATE TABLE IF NOT EXISTS wellness_water (
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 id UUID NOT NULL, day DATE NOT NULL,
 ml INTEGER NOT NULL CHECK(ml BETWEEN 10 AND 2000),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(user_id,id)
);
CREATE INDEX IF NOT EXISTS wellness_water_day ON wellness_water(user_id,day);
CREATE TABLE IF NOT EXISTS wellness_weight (
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 day DATE NOT NULL, kg NUMERIC(4,1) NOT NULL CHECK(kg BETWEEN 1 AND 500),
 PRIMARY KEY(user_id,day)
);
ALTER TABLE wellness_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_water ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_weight ENABLE ROW LEVEL SECURITY;
-- Weight is stored in weight_logs (shared with the profile card, calorie targets and weekly guide).
-- Carry over anything written to the earlier wellness_weight table; the profile value wins on the same day.
INSERT INTO weight_logs(user_id,day,weight_kg)
 SELECT user_id,day,kg FROM wellness_weight WHERE kg BETWEEN 25 AND 350
 ON CONFLICT(user_id,day) DO NOTHING;
