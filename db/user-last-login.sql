-- Historical sessions are incomplete after logout; do not invent a past login.
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
