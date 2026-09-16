import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const root = resolve(import.meta.dirname, "..");
const envFile = readFileSync(resolve(root, ".env.local"), "utf8");
const databaseUrl = envFile.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL is missing from .env.local");

const client = new pg.Client({ connectionString: databaseUrl });
try {
  await client.connect();
  await client.query(readFileSync(resolve(root, "db/schema.sql"), "utf8"));
  console.log("PostgreSQL schema is ready.");
} finally {
  await client.end();
}
