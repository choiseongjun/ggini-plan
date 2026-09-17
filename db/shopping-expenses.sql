CREATE TABLE IF NOT EXISTS shopping_expenses (
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 id UUID NOT NULL,
 scope TEXT NOT NULL CHECK(scope IN ('products','ingredients')),
 payload JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(user_id,id)
);
