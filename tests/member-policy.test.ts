import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { NextRequest } from 'next/server';
import { POST as register } from '../app/api/auth/register/route';
import { googleUser } from '../lib/google-auth';
import { getPool } from '../lib/db';
import { MEMBER_POLICY_VERSION, validMemberConsent } from '../lib/member-policy';

// All database operations below are mocked; this suite never connects to a real database.
process.env.DATABASE_URL = 'postgresql://policy_test:unused@127.0.0.1:1/policy_test';
const pool = getPool();
after(async () => { await pool.end(); });
const consent = { terms: true, privacy: true, age14: true, version: MEMBER_POLICY_VERSION };
const user = { id: '1', name: '테스트', email: 'policy@example.test' };
const identity = { ...user, subject: 'test-google-subject' };
const request = (value: unknown) => new NextRequest('http://localhost:3000/api/auth/register', {
  method: 'POST', headers: { origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: user.name, email: user.email, password: 'test-password-123', consent: value }),
});

test('email signup is closed: every request gets 410 before touching the database', async t => {
  const db = t.mock.method(pool, 'query', async () => { throw new Error('Must not query'); });
  for (const value of [undefined, { ...consent, terms: false }, consent]) {
    assert.equal((await register(request(value))).status, 410);
  }
  assert.equal(db.mock.callCount(), 0);
});

test('member consent validation rejects missing, partial, string-valued and obsolete consent', () => {
  const rejected = [undefined, null, {}, { ...consent, terms: false }, { ...consent, privacy: false }, { ...consent, age14: false }, { ...consent, age14: 'true' }, { ...consent, version: 'old' }];
  for (const value of rejected) assert.equal(validMemberConsent(value), false);
  assert.equal(validMemberConsent(consent), true);
});

test('new Google identities cannot bypass consent; existing identities can still log in', async t => {
  const calls: string[] = [];
  let existing = false;
  const client = {
    query: async (sql: string) => {
      calls.push(sql);
      return { rows: sql.includes('SELECT u.id') && existing ? [user] : [] };
    },
    release() {},
  };
  t.mock.method(pool, 'connect', async () => client);
  await assert.rejects(googleUser(identity), { message: 'google_consent_required' });
  assert.ok(calls.includes('ROLLBACK'));
  assert.equal(calls.some(sql => sql.includes('INSERT INTO users')), false);
  existing = true;
  assert.deepEqual(await googleUser(identity), user);
  assert.equal(calls.some(sql => sql.includes('UPDATE users')), false);
});

test('Google signup persists explicit consent inside the account transaction', async t => {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const client = {
    query: async (sql: string, values?: unknown[]) => {
      calls.push({ sql, values });
      return { rows: sql.includes('INSERT INTO users') ? [user] : [] };
    },
    release() {},
  };
  t.mock.method(pool, 'connect', async () => client);
  assert.deepEqual(await googleUser(identity, consent), user);
  const insert = calls.find(call => call.sql.includes('INSERT INTO users'))!;
  assert.equal(insert.values?.[2], MEMBER_POLICY_VERSION);
  assert.match(insert.sql, /age14_confirmed_at/);
  assert.equal(calls.at(-1)?.sql, 'COMMIT');
});
