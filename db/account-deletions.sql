-- 회원 탈퇴 기록: 탈퇴 처리 확인·분쟁 대응과 이탈 통계용. 이름·이메일 등 연락처는 남기지 않고 1년 뒤 지운다.
-- user_id는 삭제된 계정의 내부 번호로, 남은 다른 테이블과 연결되지 않는다(외래 키 없음).
CREATE TABLE IF NOT EXISTS account_deletions (
 id BIGSERIAL PRIMARY KEY,
 user_id BIGINT NOT NULL,
 login_method TEXT NOT NULL CHECK(login_method IN ('google','apple','password')),
 platform TEXT NOT NULL CHECK(platform IN ('ios','android','web')),
 account_created_at TIMESTAMPTZ,
 deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 meal_logs INTEGER NOT NULL DEFAULT 0,
 saved_plans INTEGER NOT NULL DEFAULT 0,
 purge_after TIMESTAMPTZ NOT NULL DEFAULT NOW()+INTERVAL '1 year'
);
CREATE INDEX IF NOT EXISTS account_deletions_deleted_idx ON account_deletions(deleted_at);
ALTER TABLE account_deletions ENABLE ROW LEVEL SECURITY;
