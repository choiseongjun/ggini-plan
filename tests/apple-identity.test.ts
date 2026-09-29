import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { firebaseAppleIdentity } from '../lib/firebase-server';
const token = { aud: 'test-project', iss: 'test-issuer', sub: 'test-user', uid: 'test-user', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600, auth_time: Math.floor(Date.now() / 1000), email_verified: true, firebase: { sign_in_provider: 'google.com', identities: { 'google.com': ['google-subject'] } } } as DecodedIdToken;


test("Apple identity validates provider, verified email and authentication freshness", () => {
  const apple = { ...token, name: undefined, email: 'hidden@privaterelay.appleid.com', firebase: { sign_in_provider: 'apple.com', identities: { 'apple.com': ['apple-subject'] } } } as DecodedIdToken;
  assert.deepEqual(firebaseAppleIdentity(apple), { subject: 'apple-subject', email: 'hidden@privaterelay.appleid.com', name: '끼니 사용자' });
  assert.throws(() => firebaseAppleIdentity(token));
  assert.throws(() => firebaseAppleIdentity({ ...apple, email_verified: false }));
  assert.throws(() => firebaseAppleIdentity({ ...apple, email: 'a@b@c.com' }));
  assert.throws(() => firebaseAppleIdentity({ ...apple, auth_time: token.auth_time - 600 }));
  assert.throws(() => firebaseAppleIdentity({ ...apple, auth_time: token.auth_time + 600 }));
  assert.throws(() => firebaseAppleIdentity({ ...apple, firebase: { sign_in_provider: 'apple.com', identities: {} } }));
});
