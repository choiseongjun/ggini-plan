-- 리텐션 측정용 이벤트 추가: 사진 기록·체중 기록·알림 켬·알림으로 들어옴.
ALTER TABLE planner_events DROP CONSTRAINT IF EXISTS planner_events_event_check;
ALTER TABLE planner_events ADD CONSTRAINT planner_events_event_check CHECK(event IN ('visit','generated','swapped','seller','returned','photo_logged','weight_logged','push_enabled','push_opened'));
