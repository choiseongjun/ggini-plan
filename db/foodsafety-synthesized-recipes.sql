-- AI-drafted ingredient compositions for government dishes that have no ingredient list of their
-- own (only aggregate nutrition). A recipe here never reaches the recommendation engine until an
-- admin reviews and approves it: 'draft' rows are inert, only 'approved' rows get resolved into
-- real, priced PlanProducts (via cookingIngredientPool, retailer-agnostic).
CREATE TABLE IF NOT EXISTS foodsafety_synthesized_recipes (
  food_code TEXT PRIMARY KEY,
  dish_name TEXT NOT NULL,
  roles JSONB NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by BIGINT REFERENCES users(id) ON DELETE SET NULL
);
