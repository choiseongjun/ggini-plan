import { NextRequest } from "next/server";
import { authFailure, deleteSession, sameOrigin } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return authFailure("요청을 확인할 수 없습니다.", 403);
  try { return await deleteSession(request); }
  catch (error) {
    console.error("Logout failed", error);
    return authFailure("로그아웃을 처리할 수 없습니다.", 503);
  }
}
