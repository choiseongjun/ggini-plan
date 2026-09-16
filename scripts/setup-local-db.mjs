import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const nextEnvPath = resolve(root, ".env.local");
let env = existsSync(nextEnvPath) ? readFileSync(nextEnvPath, "utf8") : "";
const localUrl = env.match(/^DATABASE_URL_LOCAL=(.+)$/m)?.[1]?.trim();
const savedPassword = env.match(/^POSTGRES_PASSWORD=(.+)$/m)?.[1]?.trim();
const password = savedPassword ?? (localUrl ? decodeURIComponent(new URL(localUrl).password) : randomBytes(24).toString("hex"));

function appendEnv(key, value) {
  const existing = new RegExp(`^${key}=(.*)$`, "m");
  const match = env.match(existing);
  if (match?.[1]) return;
  if (match) {
    env = env.replace(existing, () => `${key}=${value}`);
    return;
  }
  env = `${env.trimEnd()}${env.trim() ? "\n" : ""}${key}=${value}\n`;
}

const databaseUrl = localUrl ?? `postgresql://kkiniplan:${encodeURIComponent(password)}@localhost:5432/kkiniplan`;
appendEnv("POSTGRES_PASSWORD", password);
appendEnv("DATABASE_URL_LOCAL", databaseUrl);
appendEnv("DATABASE_URL", databaseUrl);
writeFileSync(nextEnvPath, env);

console.log("Local PostgreSQL environment is ready.");
