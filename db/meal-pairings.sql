CREATE TABLE IF NOT EXISTS meal_composition_templates (
 id text PRIMARY KEY, name text NOT NULL, slots jsonb NOT NULL CHECK(jsonb_typeof(slots)='array'),
 enabled boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS meal_menu_roles (
 menu_id text NOT NULL, role text NOT NULL, source text NOT NULL, PRIMARY KEY(menu_id,role)
);
CREATE TABLE IF NOT EXISTS meal_pairing_relations (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 anchor_id text NOT NULL, companion_id text NOT NULL,
 template_id text NOT NULL REFERENCES meal_composition_templates(id), slot text NOT NULL,
 relation_type text NOT NULL CHECK(relation_type IN ('pairing','substitute','avoid_pairing')),
 score integer NOT NULL CHECK(score BETWEEN 0 AND 100), reason text NOT NULL,
 score_details jsonb NOT NULL DEFAULT '{}', source text NOT NULL, confidence real CHECK(confidence BETWEEN 0 AND 1),
 status text NOT NULL DEFAULT 'suggested' CHECK(status IN ('suggested','approved','excluded')),
 created_by text NOT NULL DEFAULT 'seed', reviewed_by text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(anchor_id,companion_id,template_id,slot,relation_type), CHECK(anchor_id<>companion_id)
);
CREATE TABLE IF NOT EXISTS meal_pairing_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, relation_id bigint NOT NULL REFERENCES meal_pairing_relations(id),
 actor text NOT NULL, before_data jsonb NOT NULL, after_data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE meal_composition_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_menu_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_pairing_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_pairing_audit ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS meal_pairing_status ON meal_pairing_relations(status,anchor_id);
ALTER TABLE shopping_plans ADD COLUMN IF NOT EXISTS composition_snapshot jsonb;
