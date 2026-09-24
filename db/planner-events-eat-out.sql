-- '지금 뭐 먹지?'(외식 추천·비교) 사용 이벤트.
ALTER TABLE planner_events DROP CONSTRAINT IF EXISTS planner_events_event_check;
ALTER TABLE planner_events ADD CONSTRAINT planner_events_event_check CHECK(event IN ('visit','generated','swapped','seller','returned','photo_logged','weight_logged','push_enabled','push_opened','push_logged','push_action_logged','snack_logged','eat_out_used'));
