import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createHash, randomBytes } from "node:crypto";
import { LoginTicket, OAuth2Client, type TokenPayload } from "google-auth-library";
import { NextRequest } from "next/server";
import { POST as start } from "../app/api/auth/google/route";
import { GET as callback } from "../app/api/auth/google/callback/route";
import { POST as passwordLogin } from "../app/api/auth/login/route";
import { getPool } from "../lib/db";
import { sessionUser, SESSION_COOKIE } from "../lib/auth";
import { beginGoogleLogin, consumeGoogleAttempt, googleIdentity, googleUser, GOOGLE_STATE_COOKIE } from "../lib/google-auth";

const prefix = `google-test-${randomBytes(8).toString("hex")}`;
const emails = [`${prefix}@example.test`, `${prefix}-existing@example.test`, `${prefix}-callback@example.test`];
const states: string[] = [];
const originalEnv = { id: process.env.GOOGLE_CLIENT_ID, secret: process.env.GOOGLE_CLIENT_SECRET, origin: process.env.AUTH_URL };
process.env.GOOGLE_CLIENT_ID = "integration-test.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET = "integration-test-only";
process.env.AUTH_URL = "http://localhost:3000";
const origin = process.env.AUTH_URL;
const stateHash = (state: string) => createHash("sha256").update(state).digest("hex");
const claims = (email: string, nonce: string): TokenPayload => ({
  iss: "https://accounts.google.com", aud: process.env.GOOGLE_CLIENT_ID!,
  sub: `${prefix}-${email}`, email, email_verified: true, name: "구글 테스트",
  iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600,
  ...{ nonce },
});

after(async () => {
  await getPool().query("DELETE FROM users WHERE email = ANY($1::text[])", [emails]);
  await getPool().query("DELETE FROM oauth_login_attempts WHERE state_hash = ANY($1::text[])", [states.map(stateHash)]);
  await getPool().end();
  for (const [key, value] of Object.entries({ GOOGLE_CLIENT_ID: originalEnv.id, GOOGLE_CLIENT_SECRET: originalEnv.secret, AUTH_URL: originalEnv.origin })) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

test("Google OAuth local integration (Google exchange and verification are mocked only in callback test)", async (t) => {
  await t.test("rejects cross-origin initiation and handles missing credentials", async () => {
    assert.equal((await start(new NextRequest(`${origin}/api/auth/google`, { method: "POST", headers: { origin: "https://untrusted.example" } }))).status, 403);
    const saved = process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_CLIENT_SECRET;
    try {
      const response = await start(new NextRequest(`${origin}/api/auth/google`, { method: "POST", headers: { origin } }));
      assert.equal(response.status, 503);
      assert.equal(response.cookies.get(GOOGLE_STATE_COOKIE), undefined);
    } finally { process.env.GOOGLE_CLIENT_SECRET = saved; }
  });

  await t.test("requests only identity scopes, uses PKCE and consumes state once", async () => {
    const flow = await beginGoogleLogin(); states.push(flow.state);
    const url = new URL(flow.url);
    assert.equal(url.origin, "https://accounts.google.com");
    assert.equal(url.searchParams.get("redirect_uri"), `${origin}/api/auth/google/callback`);
    assert.equal(url.searchParams.get("scope"), "openid email profile");
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
    await assert.rejects(consumeGoogleAttempt(flow.state, randomBytes(32).toString("base64url")), { message: "google_expired" });
    const attempt = await consumeGoogleAttempt(flow.state, flow.state);
    assert.equal(createHash("sha256").update(attempt.code_verifier).digest("base64url"), url.searchParams.get("code_challenge"));
    assert.equal(attempt.nonce, url.searchParams.get("nonce"));
    await assert.rejects(consumeGoogleAttempt(flow.state, flow.state), { message: "google_expired" });
    const expired = await beginGoogleLogin(); states.push(expired.state);
    await getPool().query("UPDATE oauth_login_attempts SET expires_at = NOW() - INTERVAL '1 second' WHERE state_hash = $1", [stateHash(expired.state)]);
    await assert.rejects(consumeGoogleAttempt(expired.state, expired.state), { message: "google_expired" });
  });

  await t.test("rejects mismatched nonce and unverified email", () => {
    assert.throws(() => googleIdentity(claims(emails[0], "wrong"), "expected"), { message: "google_failed" });
    assert.throws(() => googleIdentity({ ...claims(emails[0], "expected"), email_verified: false }, "expected"), { message: "google_failed" });
  });

  await t.test("creates one Google account, handles repeated callbacks, and refuses local-password login", async () => {
    const identity = googleIdentity(claims(emails[0], "nonce"), "nonce");
    const [first, second] = await Promise.all([googleUser(identity), googleUser(identity)]);
    assert.equal(first.id, second.id);
    const account = await getPool().query("SELECT password_hash FROM users WHERE id = $1", [first.id]);
    assert.equal(account.rows[0].password_hash, null);
    const response = await passwordLogin(new NextRequest(`${origin}/api/auth/login`, {
      method: "POST", headers: { origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email: emails[0], password: "arbitrary-password" }),
    }));
    assert.equal(response.status, 401);
    // An email change must not create a new identity or switch accounts.
    assert.equal((await googleUser({ ...identity, email: emails[1] })).id, first.id);
  });

  await t.test("does not take over an existing email account", async () => {
    await getPool().query("INSERT INTO users (name, email, password_hash) VALUES ('기존 계정', $1, 'test-only-hash')", [emails[1]]);
    const identity = googleIdentity(claims(emails[1], "nonce"), "nonce");
    await assert.rejects(googleUser(identity), { message: "google_account_exists" });
    const linked = await getPool().query("SELECT 1 FROM oauth_accounts WHERE provider_subject = $1", [identity.subject]);
    assert.equal(linked.rowCount, 0);
  });

  await t.test("callback creates a persisted session, clears state, and rejects replay", async () => {
    const startResponse = await start(new NextRequest(`${origin}/api/auth/google`, { method: "POST", headers: { origin } }));
    assert.equal(startResponse.status, 200);
    const url = new URL((await startResponse.json()).url);
    const state = url.searchParams.get("state")!; states.push(state);
    const cookie = startResponse.cookies.get(GOOGLE_STATE_COOKIE)!;
    assert.equal(cookie.value, state);
    assert.equal(cookie.httpOnly, true);
    const attempt = (await getPool().query("SELECT code_verifier FROM oauth_login_attempts WHERE state_hash = $1", [stateHash(state)])).rows[0];
    const tokenMock = t.mock.method(OAuth2Client.prototype, "getToken", async (options: { code: string; codeVerifier: string }) => {
      assert.equal(options.code, "test-authorization-code");
      assert.equal(options.codeVerifier, attempt.code_verifier);
      return { tokens: { id_token: "provider-test-token" } };
    });
    const verifyMock = t.mock.method(OAuth2Client.prototype, "verifyIdToken", async (options: { idToken: string; audience: string }) => {
      assert.equal(options.idToken, "provider-test-token");
      assert.equal(options.audience, process.env.GOOGLE_CLIENT_ID);
      return new LoginTicket(undefined, claims(emails[2], url.searchParams.get("nonce")!));
    });
    try {
      const request = () => new NextRequest(`${origin}/api/auth/google/callback?state=${state}&code=test-authorization-code`, { headers: { Cookie: `${GOOGLE_STATE_COOKIE}=${state}` } });
      const response = await callback(request());
      assert.equal(response.status, 303);
      assert.equal(response.headers.get("location"), `${origin}/`);
      assert.equal(response.cookies.get(GOOGLE_STATE_COOKIE)?.maxAge, 0);
      const session = response.cookies.get(SESSION_COOKIE);
      assert.ok(session?.httpOnly);
      const user = await sessionUser(new NextRequest(`${origin}/api/auth/me`, { headers: { Cookie: `${SESSION_COOKIE}=${session.value}` } }));
      assert.equal(user?.email, emails[2]);
      assert.match((await callback(request())).headers.get("location")!, /auth_error=google_expired$/);
      assert.equal(tokenMock.mock.callCount(), 1);
    } finally { tokenMock.mock.restore(); verifyMock.mock.restore(); }
  });

  await t.test("returns cancellation to the login screen without creating a session", async () => {
    const flow = await beginGoogleLogin(); states.push(flow.state);
    const response = await callback(new NextRequest(`${origin}/api/auth/google/callback?state=${flow.state}&error=access_denied`, { headers: { Cookie: `${GOOGLE_STATE_COOKIE}=${flow.state}` } }));
    assert.match(response.headers.get("location")!, /auth_error=google_cancelled$/);
    assert.equal(response.cookies.get(SESSION_COOKIE), undefined);
    assert.equal(response.cookies.get(GOOGLE_STATE_COOKIE)?.maxAge, 0);
  });
});
