CREATE TABLE IF NOT EXISTS dinner_battles (
 id UUID PRIMARY KEY,
 owner_hash TEXT NOT NULL,
 menu_a TEXT NOT NULL CHECK(char_length(menu_a) BETWEEN 1 AND 40),
 menu_b TEXT NOT NULL CHECK(char_length(menu_b) BETWEEN 1 AND 40 AND menu_a <> menu_b),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
 closed_at TIMESTAMPTZ,
 eaten_choice SMALLINT CHECK(eaten_choice IN (0,1)),
 caption TEXT CHECK(char_length(caption) <= 200),
 photo BYTEA,
 CHECK(photo IS NULL OR octet_length(photo) <= 1048576)
);
CREATE INDEX IF NOT EXISTS dinner_battles_owner ON dinner_battles(owner_hash,created_at);
CREATE TABLE IF NOT EXISTS dinner_battle_votes (
 battle_id UUID NOT NULL REFERENCES dinner_battles(id) ON DELETE CASCADE,
 voter_hash TEXT NOT NULL,
 choice SMALLINT NOT NULL CHECK(choice IN (0,1)),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(battle_id,voter_hash)
);
ALTER TABLE dinner_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dinner_battle_votes ENABLE ROW LEVEL SECURITY;
