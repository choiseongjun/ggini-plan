import { randomBytes } from 'node:crypto';
import { writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hash } from 'bcryptjs';
import pg from 'pg';

// Run only against the explicitly selected deployment database. Never overwrite users.
if (process.argv[2] !== '--create') throw new Error('Use --create after verifying the target DATABASE_URL.');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const email = 'store-review@gginiplan.kr';
const admins = (process.env.ADMIN_EMAILS ?? '').split(',').map(value => value.trim().toLowerCase());
if (admins.includes(email)) throw new Error('The review account must not be an administrator.');
const password = randomBytes(24).toString('base64url');
const output = resolve('.env.review.local');
// Exclusive creation avoids losing a previous credential. This file is gitignored.
await writeFile(output, `REVIEW_EMAIL=${email}\nREVIEW_PASSWORD=${password}\n`, { flag: 'wx', mode: 0o600 });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
try {
  await pool.query('INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)',
    ['스토어 심사', email, await hash(password, 12)]);
  console.log('Created a regular review account. Credentials are in .env.review.local; do not commit or print them.');
} catch (error) {
  // A duplicate account is never reset, promoted or reused by this script.
  // Keep credentials on uncertain network failures: the server may have committed.
  if (error?.code === '23505') await unlink(output);
  throw new Error('Review account creation failed. Inspect database status before retrying; existing accounts were not changed.');
} finally {
  await pool.end();
}
