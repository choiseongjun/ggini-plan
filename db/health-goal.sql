CREATE TABLE IF NOT EXISTS health_goals (
 user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 goal TEXT NOT NULL CHECK (goal IN ('lose','muscle','maintain')),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
