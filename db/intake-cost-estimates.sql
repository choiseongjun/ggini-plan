CREATE TABLE IF NOT EXISTS intake_cost_estimates (
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 fingerprint TEXT NOT NULL,
 result JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,fingerprint)
);
