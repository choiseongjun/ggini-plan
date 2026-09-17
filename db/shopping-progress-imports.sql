CREATE TABLE IF NOT EXISTS shopping_progress_imports (
 import_id UUID PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 scope TEXT NOT NULL CHECK(scope IN ('products','ingredients')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
