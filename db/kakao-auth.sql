BEGIN;
ALTER TABLE oauth_accounts DROP CONSTRAINT IF EXISTS oauth_accounts_provider_check;
ALTER TABLE oauth_accounts ADD CONSTRAINT oauth_accounts_provider_check CHECK (provider IN ('google','apple','kakao'));
CREATE TABLE IF NOT EXISTS kakao_login_attempts (
 state_hash CHAR(64) PRIMARY KEY,
 consent JSONB,
 mobile_challenge CHAR(64),
 expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS kakao_login_attempts_expires_idx ON kakao_login_attempts(expires_at);
COMMIT;
