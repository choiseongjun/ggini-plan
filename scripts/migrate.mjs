import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const root = resolve(import.meta.dirname, "..");
const envFile = readFileSync(resolve(root, ".env.local"), "utf8");
const key = process.argv.includes("--local") ? "DATABASE_URL_LOCAL" : "DATABASE_URL";
const databaseUrl = envFile.match(new RegExp(`^${key}=(.+)$`, "m"))?.[1]?.trim();
if (!databaseUrl) throw new Error(`${key} is missing from .env.local`);

const client = new pg.Client({ connectionString: databaseUrl });
try {
  await client.connect();
  await client.query('BEGIN');
  await client.query(readFileSync(resolve(root, "db/schema.sql"), "utf8"));
  await client.query(readFileSync(resolve(root, "db/internationalization.sql"), "utf8"));
  await client.query(readFileSync(resolve(root, "db/taiwan.sql"), "utf8"));
  await client.query(readFileSync(resolve(root, "db/taiwan-catalog-details.sql"), "utf8"));
  await client.query(readFileSync(resolve(root, "db/service-feedback.sql"), "utf8"));
  await client.query(readFileSync(resolve(root, "db/catalog-food-types.sql"), "utf8"));
  await client.query(readFileSync(resolve(root, "db/recommendation-feedback.sql"), "utf8"));
  await client.query(readFileSync(resolve(root, "db/comparison-interest.sql"), "utf8"));
  await client.query(readFileSync(resolve(root, "db/planner-events.sql"), "utf8"));
  await client.query(readFileSync(resolve(root, "db/food-deals.sql"), "utf8"));
  await client.query(readFileSync(resolve(root, "db/food-deal-collection.sql"), "utf8"));
  await client.query(readFileSync(resolve(root, "db/catalog-created-at.sql"), "utf8"));
  await client.query(readFileSync(resolve(root, 'db/catalog-nutrition-estimate.sql'), 'utf8'));
  await client.query(readFileSync(resolve(root, 'db/member-policy.sql'), 'utf8'));
  await client.query(readFileSync(resolve(root, 'db/mobile-login.sql'), 'utf8'));
  await client.query(readFileSync(resolve(root, 'db/foodsafety-processed-nutrition.sql'), 'utf8'));
  await client.query(readFileSync(resolve(root, 'db/foodsafety-synthesized-recipes.sql'), 'utf8'));
  await client.query(readFileSync(resolve(root, 'db/recipe-optimizer-results.sql'), 'utf8'));
  await client.query(readFileSync(resolve(root, 'db/food-intake-photos.sql'), 'utf8'));
  await client.query(readFileSync(resolve(root, 'db/intake-cost-estimates.sql'), 'utf8'));
  await client.query(readFileSync(resolve(root, 'db/meal-pairings.sql'), 'utf8'));
  await client.query(readFileSync(resolve(root, 'db/native-push.sql'), 'utf8'));
  await client.query('COMMIT');
  console.log("PostgreSQL schema is ready.");
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
