import { compare } from "bcryptjs";
import { NextRequest } from "next/server";
import { authFailure, createSession, type PublicUser, sameOrigin } from "../../../../lib/auth";
import { getPool } from "../../../../lib/db";

export const runtime = "nodejs";

type LoginRow = PublicUser & { password_hash: string | null };

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return authFailure("요청을 확인할 수 없습니다.", 403);
  let input: unknown;
  try { input = await request.json(); } catch { return authFailure("입력 내용을 확인해 주세요.", 400); }
  if (!input || typeof input !== "object") return authFailure("입력 내용을 확인해 주세요.", 400);
  const { email, password } = input as Record<string, unknown>;
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!cleanEmail || cleanEmail.length > 254 || typeof password !== "string") return authFailure("이메일과 비밀번호를 확인해 주세요.", 400);

  try {
    const result = await getPool().query<LoginRow>(
      "SELECT id::text AS id, name, email, password_hash FROM users WHERE email = $1",
      [cleanEmail],
    );
    const row = result.rows[0];
    if (!row?.password_hash || !(await compare(password, row.password_hash))) return authFailure("이메일 또는 비밀번호가 올바르지 않습니다.", 401);
    return await createSession({ id: row.id, name: row.name, email: row.email });
  } catch (error) {
    console.error("Login failed", error);
    return authFailure("로그인을 처리할 수 없습니다. 로컬 DB 연결을 확인해 주세요.", 503);
  }
}
