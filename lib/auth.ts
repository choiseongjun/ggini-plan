import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "./db";

export const SESSION_COOKIE = "kkiniplan_session";
const SESSION_SECONDS = 60 * 60 * 24 * 365;

export type PublicUser = { id: string; name: string; email: string };

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const target = new URL(request.url);
  if (!origin || origin === target.origin) return true;
  // Next dev normalizes the request URL to localhost even when opened at 127.0.0.1.
  // Require the browser's exact Host and port, and keep production checks unchanged.
  if (process.env.NODE_ENV !== 'development') return false;
  try {
    const source = new URL(origin);
    const loopback = (host: string) => ['localhost', '127.0.0.1', '[::1]'].includes(host);
    return source.origin === origin && loopback(source.hostname) && loopback(target.hostname)
      && source.protocol === target.protocol && source.port === target.port
      && source.host === request.headers.get('host');
  } catch { return false; }
}

export async function createSession(user: PublicUser, response: NextResponse = NextResponse.json({ user })): Promise<NextResponse> {
  const token = randomBytes(32).toString("base64url");
  await getPool().query(
    `WITH new_session AS (
       INSERT INTO sessions (token_hash, user_id, expires_at)
       VALUES ($1, $2, NOW() + $3 * INTERVAL '1 second') RETURNING user_id
     ) UPDATE users SET last_login_at = GREATEST(last_login_at, NOW())
       FROM new_session WHERE users.id = new_session.user_id`,
    [tokenHash(token), user.id, SESSION_SECONDS],
  );
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function sessionUser(request: NextRequest, renewResponse?: NextResponse): Promise<PublicUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await getPool().query<PublicUser>(renewResponse
    ? `UPDATE sessions SET expires_at = NOW() + $2 * INTERVAL '1 second'
       FROM users WHERE users.id = sessions.user_id
       AND sessions.token_hash = $1 AND sessions.expires_at > NOW()
       RETURNING users.id::text AS id, users.name, users.email`
    : `SELECT users.id::text AS id, users.name, users.email
     FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = $1 AND sessions.expires_at > NOW()`,
    renewResponse ? [tokenHash(token), SESSION_SECONDS] : [tokenHash(token)],
  );
  if (renewResponse && result.rows[0]) {
    renewResponse.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: SESSION_SECONDS,
    });
    renewResponse.headers.set("Cache-Control", "no-store");
  }
  return result.rows[0] ?? null;
}

export async function deleteSession(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) await getPool().query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash(token)]);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function authFailure(message: string, status: number): NextResponse {
  const response = NextResponse.json({ error: message }, { status });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
