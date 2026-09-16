import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "./db";

export const SESSION_COOKIE = "kkiniplan_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

export type PublicUser = { id: string; name: string; email: string };

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function createSession(user: PublicUser, response: NextResponse = NextResponse.json({ user })): Promise<NextResponse> {
  const token = randomBytes(32).toString("base64url");
  await getPool().query(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')",
    [tokenHash(token), user.id],
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

export async function sessionUser(request: NextRequest): Promise<PublicUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await getPool().query<PublicUser>(
    `SELECT users.id::text AS id, users.name, users.email
     FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = $1 AND sessions.expires_at > NOW()`,
    [tokenHash(token)],
  );
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
