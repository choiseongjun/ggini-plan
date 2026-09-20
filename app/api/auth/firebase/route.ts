import { NextRequest, NextResponse } from "next/server";
import { authFailure, createSession } from "../../../../lib/auth";
import { firebaseAdminAuth, firebaseGoogleIdentity } from "../../../../lib/firebase-server";
import { appOrigin, GoogleAuthError, googleUser } from "../../../../lib/google-auth";
import { googleAuthErrors } from "../../../../lib/auth-messages";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let origin: string;
  try { origin = appOrigin(); } catch { return authFailure("로그인 설정을 확인해 주세요.", 503); }
  if (request.headers.get("origin") !== origin || request.nextUrl.origin !== origin) return authFailure("요청을 확인할 수 없습니다.", 403);
  let input: unknown;
  try { input = await request.json(); } catch { return authFailure("로그인 요청을 확인해 주세요.", 400); }
  const idToken = input && typeof input === "object" && "idToken" in input ? input.idToken : null;
  if (typeof idToken !== "string" || idToken.length < 100 || idToken.length > 16384) return authFailure("로그인 요청을 확인해 주세요.", 400);
  let auth;
  try { auth = firebaseAdminAuth(); } catch { return authFailure("구글 로그인 설정을 확인해 주세요.", 503); }
  let identity;
  try {
    identity = firebaseGoogleIdentity(await auth.verifyIdToken(idToken));
  } catch {
    return authFailure("구글 인증을 확인하지 못했어요. 다시 로그인해 주세요.", 401);
  }
  try {
    const consent = input && typeof input === 'object' && 'consent' in input ? input.consent : undefined;
    return await createSession(await googleUser(identity, consent));
  } catch (error) {
    if (error instanceof GoogleAuthError && error.code === 'google_consent_required') {
      return NextResponse.json({ error: googleAuthErrors[error.code], code: 'consent_required' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    }
    if (error instanceof GoogleAuthError) return authFailure(googleAuthErrors[error.code], 409);
    return authFailure("로그인을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.", 503);
  }
}
