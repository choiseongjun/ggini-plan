CREATE TABLE IF NOT EXISTS monthly_budgets (
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 month_start DATE NOT NULL CHECK (EXTRACT(DAY FROM month_start)=1),
 amount INTEGER NOT NULL CHECK(amount BETWEEN 1 AND 10000000),
 PRIMARY KEY(user_id,month_start)
);
