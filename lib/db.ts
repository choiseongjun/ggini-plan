import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & { kkiniplanPool?: Pool; kkiniplanDatabaseUrl?: string };

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  if (!globalForDb.kkiniplanPool || globalForDb.kkiniplanDatabaseUrl !== process.env.DATABASE_URL) {
    const previous = globalForDb.kkiniplanPool;
    globalForDb.kkiniplanPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 15000 });
    globalForDb.kkiniplanDatabaseUrl = process.env.DATABASE_URL;
    if (previous) void previous.end().catch(() => {});
  }
  return globalForDb.kkiniplanPool;
}
