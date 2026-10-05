-- 로그인하지 않은 앱 설치자도 알림을 허용하면 기기를 등록한다(user_id 없음). 90일 동안 열지 않은 기기는 발송 작업이 지운다.
ALTER TABLE native_push_devices ALTER COLUMN user_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS native_push_guest_idx ON native_push_devices(device_id) WHERE user_id IS NULL;
-- 기본 알림을 아침·점심·저녁 세 번으로: 새 기기 기본값과, 예전 기본값(점심·저녁) 그대로인 기기.
ALTER TABLE native_push_devices ALTER COLUMN times SET DEFAULT '{"breakfast":"08:00","lunch":"12:00","dinner":"18:30"}'::jsonb;
UPDATE native_push_devices SET times='{"breakfast":"08:00","lunch":"12:00","dinner":"18:30"}'::jsonb,updated_at=NOW() WHERE times='{"lunch":"12:00","dinner":"18:30"}'::jsonb OR (user_id IS NULL AND times='{"dinner":"18:30"}'::jsonb);
