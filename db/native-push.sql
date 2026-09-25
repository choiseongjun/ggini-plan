CREATE TABLE IF NOT EXISTS native_push_devices (
 device_id CHAR(64) PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 session_hash CHAR(64) REFERENCES sessions(token_hash) ON DELETE SET NULL,
 token TEXT UNIQUE,
 enabled BOOLEAN NOT NULL DEFAULT TRUE,
 permission_granted BOOLEAN NOT NULL DEFAULT FALSE,
 times JSONB NOT NULL DEFAULT '{"lunch":"12:00","dinner":"18:30"}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 last_test_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS native_push_user_idx ON native_push_devices(user_id);
CREATE TABLE IF NOT EXISTS native_push_deliveries (
 device_id CHAR(64) NOT NULL REFERENCES native_push_devices(device_id) ON DELETE CASCADE,
 day DATE NOT NULL,
 slot TEXT NOT NULL CHECK(slot IN ('breakfast','lunch','dinner')),
 state TEXT NOT NULL CHECK(state IN ('sending','sent','failed','skipped')),
 attempts INTEGER NOT NULL DEFAULT 1,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(device_id,day,slot)
);
