CREATE TABLE IF NOT EXISTS planner_events (
 day DATE NOT NULL,
 visitor_hash TEXT NOT NULL,
 event TEXT NOT NULL CHECK(event IN ('visit','generated','swapped','seller','returned')),
 PRIMARY KEY(day,visitor_hash,event)
);
CREATE INDEX IF NOT EXISTS planner_events_visitor_day ON planner_events(visitor_hash,day);
ALTER TABLE planner_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS planner_event_limits(day DATE NOT NULL,network_hash TEXT NOT NULL,requests INTEGER NOT NULL,PRIMARY KEY(day,network_hash));
ALTER TABLE planner_event_limits ENABLE ROW LEVEL SECURITY;
