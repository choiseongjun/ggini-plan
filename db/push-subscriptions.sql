-- 식사 시간 웹 푸시 구독. times는 {"breakfast":"08:00","lunch":"12:00","dinner":"18:30"}처럼 끼니별 알림 시각(KST),
-- 끄고 싶은 끼니는 빠진다. sent는 끼니별 마지막 발송 날짜로 같은 날 두 번 보내지 않게 한다.
CREATE TABLE IF NOT EXISTS push_subscriptions (
 endpoint TEXT PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 keys JSONB NOT NULL,
 times JSONB NOT NULL DEFAULT '{}'::jsonb,
 sent JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id);
