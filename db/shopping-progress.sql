CREATE TABLE IF NOT EXISTS shopping_progress (
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 scope TEXT NOT NULL CHECK(scope IN ('products','ingredients')),
 stock JSONB NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(stock)='object'),
 version INTEGER NOT NULL DEFAULT 1,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(user_id,scope)
);
