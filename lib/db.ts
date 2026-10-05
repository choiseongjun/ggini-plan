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
    // Vercel: few, short-lived connections per instance. A long-running local server instead keeps
    // connections warm — reconnecting to the remote pooler per request takes seconds and queued
    // requests (dashboard runs six queries at once) hit the connect timeout.
    // `next build` runs many workers at once, so it keeps the small pool too.
    const serverless = Boolean(process.env.VERCEL) || process.env.NEXT_PHASE === 'phase-production-build';
    globalForDb.kkiniplanPool = new Pool({
      connectionString: databaseUrl.toString(),
      max: serverless ? 2 : 6,
      idleTimeoutMillis: serverless ? 1000 : 30000,
      connectionTimeoutMillis: 15000,
    });
    // Release idle sessions before a Vercel instance is suspended.
    if (process.env.VERCEL) attachDatabasePool(globalForDb.kkiniplanPool);
    globalForDb.kkiniplanDatabaseUrl = process.env.DATABASE_URL;
    if (previous) void previous.end().catch(() => {});
  }
  return globalForDb.kkiniplanPool;
}
