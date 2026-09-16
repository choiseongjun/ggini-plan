import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";

const globalForDb = globalThis as typeof globalThis & { kkiniplanPool?: Pool; kkiniplanDatabaseUrl?: string };

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  if (!globalForDb.kkiniplanPool || globalForDb.kkiniplanDatabaseUrl !== process.env.DATABASE_URL) {
    const previous = globalForDb.kkiniplanPool;
    const databaseUrl = new URL(process.env.DATABASE_URL);
    // Supabase transaction pooling is intended for short-lived serverless workers.
    if (process.env.VERCEL && databaseUrl.hostname.endsWith(".pooler.supabase.com") && databaseUrl.port === "5432") {
      databaseUrl.port = "6543";
    }
    globalForDb.kkiniplanPool = new Pool({
      connectionString: databaseUrl.toString(),
      max: 2,
      idleTimeoutMillis: 1000,
      connectionTimeoutMillis: 15000,
    });
    // Release idle sessions before a Vercel instance is suspended.
    if (process.env.VERCEL) attachDatabasePool(globalForDb.kkiniplanPool);
    globalForDb.kkiniplanDatabaseUrl = process.env.DATABASE_URL;
    if (previous) void previous.end().catch(() => {});
  }
  return globalForDb.kkiniplanPool;
}
