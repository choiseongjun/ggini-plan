import { NextRequest, NextResponse } from "next/server";
import { authFailure } from "../../../../lib/auth";
import { googleAuthErrors } from "../../../../lib/auth-messages";
import { appOrigin, beginGoogleLogin, GoogleAuthError, GOOGLE_FLOW_SECONDS, GOOGLE_STATE_COOKIE, GOOGLE_STATE_PATH } from "../../../../lib/google-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const origin = appOrigin();
    if (request.headers.get("origin") !== origin || new URL(request.url).origin !== origin) {
      return authFailure("로그인을 시작한 주소를 확인해 주세요.", 403);
    }
    const { state, url } = await beginGoogleLogin();
    const response = NextResponse.json({ url });
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(GOOGLE_STATE_COOKIE, state, {
      httpOnly: true, sameSite: "lax", secure: origin.startsWith("https:"),
      path: GOOGLE_STATE_PATH, maxAge: GOOGLE_FLOW_SECONDS,
    });
    return response;
  } catch (error) {
    const code = error instanceof GoogleAuthError ? error.code : "google_failed";
    // Do not log OAuth errors: provider errors may contain credentials or tokens.
    return authFailure(googleAuthErrors[code], 503);
  }
}
