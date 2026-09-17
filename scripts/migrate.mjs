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
  await client.query('COMMIT');
  console.log("PostgreSQL schema is ready.");
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
