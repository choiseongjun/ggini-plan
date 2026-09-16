import { NextRequest, NextResponse } from "next/server";
import { authFailure, createSession } from "../../../../../lib/auth";
import { appOrigin, consumeGoogleAttempt, googleClient, GoogleAuthError, googleIdentity, googleUser, GOOGLE_STATE_COOKIE, GOOGLE_STATE_PATH } from "../../../../../lib/google-auth";

export const runtime = "nodejs";

function finish(response: NextResponse, origin: string) {
  response.cookies.set(GOOGLE_STATE_COOKIE, "", {
    httpOnly: true, sameSite: "lax", secure: origin.startsWith("https:"), path: GOOGLE_STATE_PATH, maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: NextRequest) {
  let origin: string;
  try { origin = appOrigin(); } catch { return authFailure("구글 로그인 설정을 확인해 주세요.", 503); }
  try {
    const params = request.nextUrl.searchParams;
    const attempt = await consumeGoogleAttempt(params.get("state"), request.cookies.get(GOOGLE_STATE_COOKIE)?.value);
    if (params.get("error")) throw new GoogleAuthError(params.get("error") === "access_denied" ? "google_cancelled" : "google_failed");
    const code = params.get("code");
    if (!code || code.length > 4096) throw new GoogleAuthError("google_failed");
    const { client, clientId, redirectUri } = googleClient();
    const { tokens } = await client.getToken({ code, codeVerifier: attempt.code_verifier, redirect_uri: redirectUri });
    if (!tokens.id_token) throw new GoogleAuthError("google_failed");
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
    const user = await googleUser(googleIdentity(ticket.getPayload(), attempt.nonce));
    return finish(await createSession(user, NextResponse.redirect(new URL("/", origin), 303)), origin);
  } catch (error) {
    const code = error instanceof GoogleAuthError ? error.code : "google_failed";
    const destination = new URL("/", origin);
    destination.searchParams.set("auth_error", code);
    return finish(NextResponse.redirect(destination, 303), origin);
  }
}
