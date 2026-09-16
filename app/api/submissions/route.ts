import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { sessionUser, sameOrigin } from "../../../lib/auth";
import { getPool } from "../../../lib/db";
import { validateSubmission } from "../../../lib/submissions";
import { validatedPhoto } from "../../../lib/nutrition-photo";
import { uploadSubmissionPhoto, removeSubmissionPhoto } from "../../../lib/submission-storage";
export const runtime = "nodejs";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request: NextRequest) {
  try {
    const mine = request.nextUrl.searchParams.get("mine") === "1";
    const user = mine ? await sessionUser(request) : null;
    if (mine && !user) return json({ error: "로그인이 필요합니다." }, 401);
    const { rows } = await getPool().query(`SELECT id,payload,status,version,photo_path IS NOT NULL AS photo,created_at,catalog_id${mine ? ",review_note" : ""} FROM submissions WHERE ${mine ? "user_id=$1" : "status='approved'"} ORDER BY created_at DESC LIMIT 100`, mine ? [user!.id] : []);
    // Unverified nutrition notes are only visible to the author and reviewers.
    if (!mine) for (const row of rows) row.payload = { ...row.payload, nutrition: "" };
    return json({ items: rows });
  } catch { return json({ error: "제보 목록을 불러오지 못했습니다." }, 503); }
}
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "요청 출처를 확인해 주세요." }, 403);
  let uploaded: string | null = null;
  try {
    const user = await sessionUser(request); if (!user) return json({ error: "로그인 후 제보해 주세요." }, 401);
    if (Number(request.headers.get("content-length")) > 9 * 1024 * 1024) return json({ error: "사진은 8MB 이하여야 합니다." }, 413);
    const form = await request.formData();
    let payload; let photo;
    try { payload = validateSubmission(JSON.parse(String(form.get("payload")))); photo = await validatedPhoto(form.get("photo")); }
    catch (e) { return json({ error: e instanceof Error ? e.message : "입력을 확인해 주세요." }, 400); }
    const id = String(form.get("id") || ""); const version = Number(form.get("version"));
    if (id && !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "제보를 찾을 수 없습니다." }, 404);
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [user.id]);
      const old = id ? (await client.query("SELECT * FROM submissions WHERE id=$1 AND user_id=$2 FOR UPDATE", [id, user.id])).rows[0] : null;
      if (id && !old) { await client.query("ROLLBACK"); return json({ error: "제보를 찾을 수 없습니다." }, 404); }
      if (old && (old.status === "approved" || old.version !== version)) { await client.query("ROLLBACK"); return json({ error: "이미 승인됐거나 내용이 변경됐습니다. 목록을 새로고침해 주세요." }, 409); }
      const count = await client.query("SELECT count(*)::int AS n FROM submissions WHERE user_id=$1 AND created_at>NOW()-INTERVAL '1 day'", [user.id]);
      if (!id && count.rows[0].n >= 10) { await client.query("ROLLBACK"); return json({ error: "하루에 최대 10개까지 제보할 수 있어요." }, 429); }
      if (photo) uploaded = await uploadSubmissionPhoto(photo);
      const result = id ? await client.query("UPDATE submissions SET payload=$1,photo_path=COALESCE($2,photo_path),status='pending',review_note='',reviewed_by=NULL,reviewed_at=NULL,version=version+1,updated_at=NOW() WHERE id=$3 RETURNING id", [JSON.stringify(payload), uploaded, id]) : await client.query("INSERT INTO submissions(id,user_id,payload,photo_path) VALUES($1,$2,$3,$4) RETURNING id", [randomUUID(), user.id, JSON.stringify(payload), uploaded]);
      await client.query("COMMIT"); uploaded = null;
      if (photo && old?.photo_path) await removeSubmissionPhoto(old.photo_path).catch(() => {});
      return json({ id: result.rows[0].id }, id ? 200 : 201);
    } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
  } catch { if (uploaded) await removeSubmissionPhoto(uploaded).catch(() => {}); return json({ error: "제보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503); }
}
