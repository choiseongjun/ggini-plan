import { hash } from "bcryptjs";
import { NextRequest } from "next/server";
import { authFailure, createSession, type PublicUser, sameOrigin } from "../../../../lib/auth";
import { getPool } from "../../../../lib/db";
import { validMemberConsent } from '../../../../lib/member-policy';

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return authFailure("요청을 확인할 수 없습니다.", 403);
  let input: unknown;
  try { input = await request.json(); } catch { return authFailure("입력 내용을 확인해 주세요.", 400); }
  if (!input || typeof input !== "object") return authFailure("입력 내용을 확인해 주세요.", 400);

  const { name, email, password, consent } = input as Record<string, unknown>;
  if (!validMemberConsent(consent)) return authFailure('이용약관·개인정보 수집이용 동의와 만 14세 이상 확인이 필요합니다.', 400);
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (cleanName.length < 2 || cleanName.length > 40) return authFailure("이름은 2~40자로 입력해 주세요.", 400);
  if (cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return authFailure("올바른 이메일을 입력해 주세요.", 400);
  if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72) return authFailure("비밀번호는 8자 이상, 72바이트 이하로 입력해 주세요.", 400);

  try {
    const passwordHash = await hash(password, 12);
    const result = await getPool().query<PublicUser>(
      `INSERT INTO users (name, email, password_hash, terms_version, privacy_version, terms_accepted_at, privacy_accepted_at, age14_confirmed_at)
       VALUES ($1, $2, $3, $4, $4, NOW(), NOW(), NOW()) RETURNING id::text AS id, name, email`,
      [cleanName, cleanEmail, passwordHash, consent.version],
    );
    return await createSession(result.rows[0]);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") return authFailure("이미 가입된 이메일입니다.", 409);
    console.error("Registration failed", error);
    return authFailure("회원가입을 처리할 수 없습니다. 로컬 DB 연결을 확인해 주세요.", 503);
  }
}
