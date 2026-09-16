import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dockerEnvPath = resolve(root, ".env");
const nextEnvPath = resolve(root, ".env.local");

const currentDockerEnv = existsSync(dockerEnvPath) ? readFileSync(dockerEnvPath, "utf8") : "";
const match = currentDockerEnv.match(/^POSTGRES_PASSWORD=(.+)$/m);
const password = match?.[1]?.trim() ?? randomBytes(24).toString("hex");

if (!match) {
  writeFileSync(dockerEnvPath, `${currentDockerEnv.trimEnd()}${currentDockerEnv ? "\n" : ""}POSTGRES_PASSWORD=${password}\n`);
}

const currentNextEnv = existsSync(nextEnvPath) ? readFileSync(nextEnvPath, "utf8") : "";
if (!/^DATABASE_URL=/m.test(currentNextEnv)) {
  const databaseUrl = `postgresql://kkiniplan:${encodeURIComponent(password)}@localhost:5432/kkiniplan`;
  writeFileSync(nextEnvPath, `${currentNextEnv.trimEnd()}${currentNextEnv ? "\n" : ""}DATABASE_URL=${databaseUrl}\n`);
}

console.log("Local PostgreSQL environment is ready.");
