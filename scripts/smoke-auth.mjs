import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import pg from "pg";

const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
const email = `smoke-${randomBytes(6).toString("hex")}@example.test`;
const password = randomBytes(16).toString("base64url");
const consent = { terms: true, privacy: true, age14: true, version: '2026-09-20' };
const envFile = readFileSync(resolve(import.meta.dirname, "../.env.local"), "utf8");
const databaseUrl = envFile.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL is missing");
const db = new pg.Client({ connectionString: databaseUrl });

async function post(path, body, cookie = "") {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseUrl, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
}

try {
  await db.connect();
  const registration = await post("/api/auth/register", { name: "테스트", email, password, consent });
  assert.equal(registration.status, 200, await registration.text());
  const firstCookie = registration.headers.get("set-cookie")?.split(";")[0];
  assert.ok(firstCookie?.startsWith("kkiniplan_session="));

  const duplicate = await post("/api/auth/register", { name: "테스트", email, password, consent });
  assert.equal(duplicate.status, 409);

  const wrongPassword = await post("/api/auth/login", { email, password: "wrong-password" });
  assert.equal(wrongPassword.status, 401);

  const login = await post("/api/auth/login", { email, password });
  assert.equal(login.status, 200, await login.text());
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie?.startsWith("kkiniplan_session="));

  const me = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: cookie } });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).user.email, email);

  const logout = await post("/api/auth/logout", {}, cookie);
  assert.equal(logout.status, 200);
  const afterLogout = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: cookie } });
  assert.equal((await afterLogout.json()).user, null);
  console.log("Authentication smoke test passed.");
} finally {
  await db.query("DELETE FROM users WHERE email = $1", [email]).catch(() => undefined);
  await db.end();
}
