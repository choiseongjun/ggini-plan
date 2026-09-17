CREATE TABLE IF NOT EXISTS service_feedback (
 id uuid PRIMARY KEY,
 kind text NOT NULL CHECK (kind IN ('useful','difficult','idea')),
 message text NOT NULL DEFAULT '' CHECK (length(message)<=1000),
 page text NOT NULL CHECK (length(page)<=100),
 sender_hash text NOT NULL,
 status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','done')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_feedback_sender_date ON service_feedback(sender_hash,created_at);
ALTER TABLE service_feedback ENABLE ROW LEVEL SECURITY;
