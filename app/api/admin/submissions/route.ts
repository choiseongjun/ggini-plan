import { NextRequest } from "next/server";
import { adminUser } from "../../../../lib/admin";
import { sameOrigin } from "../../../../lib/auth";
import { getPool } from "../../../../lib/db";
import { validateSubmission } from "../../../../lib/submissions";
import { readSubmissionPhoto } from "../../../../lib/submission-storage";
import { storeImage } from "../../../../lib/catalog-storage";
export const runtime = "nodejs";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request: NextRequest) {
  try {
    if (!await adminUser(request)) return json({ error: "관리자 로그인이 필요합니다." }, 403);
    const { rows } = await getPool().query("SELECT id,payload,status,review_note,version,photo_path IS NOT NULL AS photo,created_at,catalog_id FROM submissions ORDER BY (status='pending') DESC,created_at DESC LIMIT 200");
    return json({ items: rows });
  } catch { return json({ error: "제보를 불러오지 못했습니다." }, 503); }
}
export async function PUT(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "요청 출처를 확인해 주세요." }, 403);
  try {
    const admin = await adminUser(request); if (!admin) return json({ error: "관리자 권한이 필요합니다." }, 403);
    let input; try { input = await request.json(); } catch { return json({ error: "입력을 확인해 주세요." }, 400); }
    if (!input || !/^[0-9a-f-]{36}$/i.test(input.id) || !["approved", "needs_changes", "rejected"].includes(input.status) || !Number.isInteger(input.version)) return json({ error: "검토 상태를 확인해 주세요." }, 400);
    const note = typeof input.note === "string" ? input.note.trim() : "";
    if (note.length > 1000 || (input.status !== "approved" && !note)) return json({ error: "보완·반려 사유를 1~1,000자로 입력해 주세요." }, 400);
    let payload; try { payload = validateSubmission(input.payload); } catch (e) { return json({ error: e instanceof Error ? e.message : "내용을 확인해 주세요." }, 400); }
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const row = (await client.query("SELECT * FROM submissions WHERE id=$1 FOR UPDATE", [input.id])).rows[0];
      if (!row) { await client.query("ROLLBACK"); return json({ error: "제보가 없습니다." }, 404); }
      if (row.status !== "pending" || row.version !== input.version) { await client.query("ROLLBACK"); return json({ error: "이미 처리됐거나 수정된 제보입니다. 새로고침해 주세요." }, 409); }
      let catalogId = null;
      if (input.status === "approved" && payload.kind === "product") {
        let imageUrl = null;
        if (row.photo_path) { const blob = await readSubmissionPhoto(row.photo_path); imageUrl = await storeImage({ bytes: Buffer.from(await blob.arrayBuffer()), mime: blob.type }, "products"); }
        catalogId = "submission-" + row.id;
        await client.query(`INSERT INTO catalog_items(id,name,detail,price,portions,quantity,search_query,product_url,product_image_url,unit,category,in_weekly_cart,updated_by,price_checked_at,price_note) VALUES($1,$2,$3,$4,$5,$6,$2,$7,$8,$9,$10,TRUE,$11,NOW(),'사용자 제보 · 관리자 확인 가격 · 배송비 별도')`, [catalogId, payload.name, `${payload.quantity}${payload.unit} · ${payload.portions}`, payload.price, payload.portions, payload.quantity, payload.productUrl, imageUrl, payload.unit, payload.category, admin.id]);
      }
      await client.query("UPDATE submissions SET payload=$1,status=$2,review_note=$3,catalog_id=$4,reviewed_by=$5,reviewed_at=NOW(),version=version+1,updated_at=NOW() WHERE id=$6", [JSON.stringify(payload), input.status, note, catalogId, admin.id, row.id]);
      await client.query("COMMIT"); return json({ ok: true, catalogId });
    } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
  } catch { return json({ error: "검토 결과를 저장하지 못했습니다." }, 503); }
}
