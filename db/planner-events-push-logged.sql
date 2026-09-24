-- 알림이 '기록 입구'로 얼마나 쓰이는지: 알림 [먹었어요] 버튼으로 바로 기록 / 알림으로 들어와 기록.
ALTER TABLE planner_events DROP CONSTRAINT IF EXISTS planner_events_event_check;
ALTER TABLE planner_events ADD CONSTRAINT planner_events_event_check CHECK(event IN ('visit','generated','swapped','seller','returned','photo_logged','weight_logged','push_enabled','push_opened','push_logged','push_action_logged'));
