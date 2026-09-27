import { NextRequest, NextResponse } from "next/server";
import { authFailure, sessionUser } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const renewal = new NextResponse();
    const user = await sessionUser(request, renewal);
    const response = NextResponse.json({ user });
    for (const cookie of renewal.cookies.getAll()) response.cookies.set(cookie);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Session lookup failed", error);
    return authFailure("로컬 DB 연결을 확인해 주세요.", 503);
  }
}
