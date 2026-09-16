import { NextRequest, NextResponse } from "next/server";
import { authFailure, sessionUser } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ user: await sessionUser(request) });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Session lookup failed", error);
    return authFailure("로컬 DB 연결을 확인해 주세요.", 503);
  }
}
