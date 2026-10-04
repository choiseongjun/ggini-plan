-- 식사 알림 예약 실행: Supabase pg_cron이 15분마다 /api/push/dispatch를 부른다.
-- GitHub Actions schedule은 몇 시간씩 밀려 알림 시각(+60분)을 놓친다. 로컬 DB에는 pg_cron이 없으므로 migrate.mjs에 넣지 않고
-- Supabase SQL Editor에서 한 번 실행한다. 다시 실행해도 같은 이름의 작업을 덮어쓴다.
--
-- 먼저 비밀값을 Vault에 한 번만 넣는다(CRON_SECRET은 Vercel 환경변수와 같은 값):
--   select vault.create_secret('https://gginiplan.kr', 'push_app_url');
--   select vault.create_secret('<CRON_SECRET>', 'push_cron_secret');
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule('meal-reminders', '*/15 * * * *', $$
 SELECT net.http_post(
  url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'push_app_url') || '/api/push/dispatch',
  headers := jsonb_build_object(
   'Content-Type', 'application/json',
   'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'push_cron_secret')),
  timeout_milliseconds := 60000);
$$);

-- 확인: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--       SELECT id, status_code, content FROM net._http_response ORDER BY created DESC LIMIT 10;
