-- 로그인하지 않은 앱 설치자도 알림을 허용하면 기기를 등록한다(user_id 없음). 90일 동안 열지 않은 기기는 발송 작업이 지운다.
ALTER TABLE native_push_devices ALTER COLUMN user_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS native_push_guest_idx ON native_push_devices(device_id) WHERE user_id IS NULL;
