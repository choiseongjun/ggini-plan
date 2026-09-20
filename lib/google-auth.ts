import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { CodeChallengeMethod, OAuth2Client, type TokenPayload } from "google-auth-library";
import { getPool } from "./db";
import type { PublicUser } from "./auth";
import type { GoogleAuthErrorCode } from "./auth-messages";
import { validMemberConsent } from './member-policy';

export const GOOGLE_STATE_COOKIE = "kkiniplan_google_state";
export const GOOGLE_STATE_PATH = "/api/auth/google";
export const GOOGLE_FLOW_SECONDS = 600;

export class GoogleAuthError extends Error {
  constructor(public readonly code: GoogleAuthErrorCode) { super(code); }
}

export function appOrigin(): string {
  const value = process.env.AUTH_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      (url.protocol !== "https:" && !(local && url.protocol === "http:"))) {
    throw new Error("AUTH_URL must be an HTTPS origin or local HTTP origin");
  }
  return url.origin;
}

export function googleClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new GoogleAuthError("google_unavailable");
  const redirectUri = `${appOrigin()}/api/auth/google/callback`;
  return { client: new OAuth2Client(clientId, clientSecret, redirectUri), clientId, redirectUri };
}

const hashState = (state: string) => createHash("sha256").update(state).digest("hex");

export async function beginGoogleLogin() {
  const { client } = googleClient();
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
  const url = new URL(client.generateAuthUrl({
    scope: ["openid", "email", "profile"],
    access_type: "online",
    prompt: "select_account",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
  }));
  url.searchParams.set("nonce", nonce);
  await getPool().query("DELETE FROM oauth_login_attempts WHERE expires_at <= NOW()");
  await getPool().query(
    "INSERT INTO oauth_login_attempts (state_hash, code_verifier, nonce, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')",
    [hashState(state), codeVerifier, nonce],
  );
  return { state, url: url.toString() };
}

export async function consumeGoogleAttempt(state: string | null, cookie: string | undefined) {
  if (!state || !cookie || !/^[A-Za-z0-9_-]{43}$/.test(state) || !/^[A-Za-z0-9_-]{43}$/.test(cookie) ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(cookie))) {
    throw new GoogleAuthError("google_expired");
  }
  const result = await getPool().query<{ code_verifier: string; nonce: string }>(
    "DELETE FROM oauth_login_attempts WHERE state_hash = $1 AND expires_at > NOW() RETURNING code_verifier, nonce",
    [hashState(state)],
  );
  if (!result.rows[0]) throw new GoogleAuthError("google_expired");
  return result.rows[0];
}

// Called only after google-auth-library has verified the signature, issuer, audience and expiry.
export function googleIdentity(payload: TokenPayload | undefined, expectedNonce: string) {
  const claims = payload as (TokenPayload & { nonce?: string }) | undefined;
  if (!claims || claims.nonce !== expectedNonce || !claims.sub || claims.email_verified !== true ||
      !claims.email || claims.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email)) {
    throw new GoogleAuthError("google_failed");
  }
  return {
    subject: claims.sub,
    email: claims.email.trim().toLowerCase(),
    name: (claims.name?.trim() || claims.email.split("@")[0]).slice(0, 80),
  };
}

export async function googleUser(identity: ReturnType<typeof googleIdentity>, consent?: unknown): Promise<PublicUser> {
  const db = await getPool().connect();
  const findAccount = () => db.query<PublicUser>(
    `SELECT u.id::text AS id, u.name, u.email FROM users u
     JOIN oauth_accounts a ON a.user_id = u.id WHERE a.provider = 'google' AND a.provider_subject = $1`,
    [identity.subject],
  );
  try {
    await db.query("BEGIN");
    // Serialize simultaneous callbacks for the same Google identity.
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`google:${identity.subject}`]);
    const existing = (await findAccount()).rows[0];
    if (existing) { await db.query("COMMIT"); return existing; }
    if (!validMemberConsent(consent)) throw new GoogleAuthError('google_consent_required');
    const result = await db.query<PublicUser>(
      `INSERT INTO users (name, email, password_hash, terms_version, privacy_version, terms_accepted_at, privacy_accepted_at, age14_confirmed_at)
       VALUES ($1, $2, NULL, $3, $3, NOW(), NOW(), NOW())
       ON CONFLICT (email) DO NOTHING RETURNING id::text AS id, name, email`,
      [identity.name, identity.email, consent.version],
    );
    const user = result.rows[0];
    // Email alone must never attach a Google identity to an existing account.
    if (!user) throw new GoogleAuthError("google_account_exists");
    await db.query("INSERT INTO oauth_accounts (provider, provider_subject, user_id) VALUES ('google', $1, $2)", [identity.subject, user.id]);
    await db.query("COMMIT");
    return user;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally { db.release(); }
}
