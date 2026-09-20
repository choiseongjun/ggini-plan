import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { POST } from "../app/api/auth/firebase/route";
import { firebaseAdminAuth, firebaseGoogleIdentity } from "../lib/firebase-server";
import { getPool } from "../lib/db";
import { SESSION_COOKIE, sessionUser, deleteSession } from "../lib/auth";
import { MEMBER_POLICY_VERSION } from '../lib/member-policy';

const email = `firebase-test-${randomBytes(8).toString("hex")}@example.test`;
const origin = process.env.AUTH_URL ?? "http://localhost:3000";
const project = process.env.FIREBASE_PROJECT_ID!;
const token: DecodedIdToken = {
  aud: project, iss: `https://securetoken.google.com/${project}`, sub: "test-firebase-uid", uid: "test-firebase-uid",
  iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600,
  auth_time: Math.floor(Date.now() / 1000), email, email_verified: true, name: "구글 사용자",
  firebase: { sign_in_provider: "google.com", identities: { "google.com": [email], email: [email] } },
};
const request = (idToken: unknown, requestOrigin = origin) => new NextRequest(`${origin}/api/auth/firebase`, {
  method: "POST", headers: { origin: requestOrigin, "Content-Type": "application/json" }, body: JSON.stringify({ idToken, consent: { terms: true, privacy: true, age14: true, version: MEMBER_POLICY_VERSION } }),
});

after(async () => {
  await getPool().query("DELETE FROM users WHERE email = $1", [email]);
  await getPool().end();
});

test("Firebase server verification and PostgreSQL session", async (t) => {
  await t.test("rejects foreign origins, missing tokens and malformed JWTs", async () => {
    assert.equal((await POST(request("x".repeat(150), "https://untrusted.example"))).status, 403);
    assert.equal((await POST(request(null))).status, 400);
    assert.equal((await POST(request("x".repeat(150)))).status, 401);
    // This calls the real Admin SDK and does not need a service-account private key.
    const fakeJwt = [
      Buffer.from(JSON.stringify({ alg: "RS256", kid: "test-key" })).toString("base64url"),
      Buffer.from(JSON.stringify({ ...token, aud: "another-project" })).toString("base64url"),
      "invalid-signature",
    ].join(".");
    await assert.rejects(firebaseAdminAuth().verifyIdToken(fakeJwt), /audience|aud/i);
  });
  await t.test("rejects unverified emails, old authentication and non-Google providers", () => {
    assert.throws(() => firebaseGoogleIdentity({ ...token, email_verified: false }));
    assert.throws(() => firebaseGoogleIdentity({ ...token, auth_time: token.auth_time - 600 }));
    assert.throws(() => firebaseGoogleIdentity({ ...token, firebase: { ...token.firebase, sign_in_provider: "password" } }));
    assert.throws(() => firebaseGoogleIdentity({ ...token, firebase: { sign_in_provider: "google.com", identities: {} } }));
  });
  await t.test("verified identity creates a reusable DB account and logout revokes its session", async () => {
    // Only the external token verification response is mocked for this successful-flow test.
    const verification = t.mock.method(firebaseAdminAuth(), "verifyIdToken", async () => token);
    try {
      const first = await POST(request("verified-test-token".repeat(10)));
      assert.equal(first.status, 200);
      const firstUser = (await first.json()).user;
      const second = await POST(request("verified-test-token".repeat(10)));
      assert.equal((await second.json()).user.id, firstUser.id);
      const cookie = first.cookies.get(SESSION_COOKIE)!;
      assert.equal(cookie.httpOnly, true);
      const sessionRequest = new NextRequest(`${origin}/api/auth/me`, { headers: { Cookie: `${SESSION_COOKIE}=${cookie.value}` } });
      assert.equal((await sessionUser(sessionRequest))?.email, email);
      await deleteSession(sessionRequest);
      assert.equal(await sessionUser(sessionRequest), null);
    } finally { verification.mock.restore(); }
  });
});
