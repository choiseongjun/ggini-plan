CREATE TABLE IF NOT EXISTS mobile_login_codes (
 code_hash CHAR(64) PRIMARY KEY,
 challenge CHAR(64) NOT NULL,
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '2 minutes'
);
CREATE INDEX IF NOT EXISTS mobile_login_codes_expiry ON mobile_login_codes(expires_at);
ALTER TABLE mobile_login_codes ENABLE ROW LEVEL SECURITY;
