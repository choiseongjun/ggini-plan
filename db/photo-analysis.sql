CREATE TABLE IF NOT EXISTS photo_analysis_requests (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS photo_analysis_requests_created_at_idx ON photo_analysis_requests(created_at);
