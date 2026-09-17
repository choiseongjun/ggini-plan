ALTER TABLE service_feedback DROP CONSTRAINT IF EXISTS service_feedback_kind_check;
ALTER TABLE service_feedback ADD CONSTRAINT service_feedback_kind_check CHECK (kind IN ('useful','difficult','idea','recommend_good','recommend_expensive','recommend_taste','recommend_repetitive'));
