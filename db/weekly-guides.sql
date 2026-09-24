-- 사용자별 AI 맞춤 식단 가이드(문장). 숫자 목표는 매번 규칙으로 계산하고, 여기에는 AI가 쓴 설명·조언만 저장한다.
-- profile_key가 바뀌면(신체 정보·목표·건강 관리·제외 재료) 바로, recent_key가 바뀌면 6시간 뒤, 그 밖엔 7일마다 새로 만든다.
CREATE TABLE IF NOT EXISTS weekly_guides (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  profile_key TEXT NOT NULL,
  recent_key TEXT NOT NULL,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
