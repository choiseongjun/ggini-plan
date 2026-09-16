import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { getPool } from "../lib/db";
import { emptySubmission } from "../lib/submissions";
import { GET, POST } from "../app/api/submissions/route";
import { GET as adminGet, PUT } from "../app/api/admin/submissions/route";
import { GET as photoGet } from "../app/api/submissions/photo/route";

test("submission ownership, moderation, re-submission, publication and duplicate approval", async () => {
  const pool = getPool(); const users: string[] = []; const cookies: string[] = []; const submitted: string[] = []; const adminBefore = process.env.ADMIN_EMAILS;
  function req(url: string, cookie?: string) { return new NextRequest("http://localhost:3000" + url, { headers: cookie ? { cookie } : {} }); }
  const payload = { ...emptySubmission, name: "테스트 제보", description: "추천하는 이유", price: 3000, productUrl: "https://www.kurly.com/goods/5053329", nutrition: "검증 전 메모" };
  async function send(who: number, id?: string, version?: number, body = payload) { const f = new FormData(); f.set("payload", JSON.stringify(body)); if (id) f.set("id", id); if (version) f.set("version", String(version)); return POST(new NextRequest("http://localhost:3000/api/submissions", { method: "POST", headers: who < 0 ? {} : { cookie: cookies[who] }, body: f })); }
  async function review(who: number, id: string, version: number, status: string, note = "") { return PUT(new NextRequest("http://localhost:3000/api/admin/submissions", { method: "PUT", headers: { cookie: cookies[who], "Content-Type": "application/json" }, body: JSON.stringify({ id, version, status, note, payload }) })); }
  try {
    for (let i = 0; i < 3; i++) { const email = `submission-${randomUUID()}@example.test`; const u = await pool.query("INSERT INTO users(name,email) VALUES('비공개 이름',$1) RETURNING id::text", [email]); users.push(u.rows[0].id); const token = randomBytes(32).toString("hex"); cookies.push("kkiniplan_session=" + token); await pool.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 hour')", [createHash("sha256").update(token).digest("hex"), users[i]]); if (i === 2) process.env.ADMIN_EMAILS = email; }
    assert.equal((await send(-1)).status, 401);
    assert.equal((await GET(req("/api/submissions?mine=1"))).status, 401);
    assert.equal((await adminGet(req("/api/admin/submissions", cookies[0]))).status, 403);
    const created = await send(0); assert.equal(created.status, 201); const id = (await created.json()).id; submitted.push(id);
    assert.ok(!(await (await GET(req("/api/submissions"))).json()).items.some((s: { id: string }) => s.id === id));
    assert.ok(!(await (await GET(req("/api/submissions?mine=1", cookies[1]))).json()).items.some((s: { id: string }) => s.id === id));
    assert.equal((await send(1, id, 1)).status, 404);
    assert.equal((await review(0, id, 1, "approved")).status, 403);
    assert.equal((await review(2, id, 1, "needs_changes")).status, 400);
    assert.equal((await review(2, id, 1, "needs_changes", "수량 확인 부탁해요")).status, 200);
    assert.equal((await send(0, id, 1)).status, 409);
    assert.equal((await send(0, id, 2)).status, 200);
    assert.equal((await review(2, id, 3, "approved")).status, 200);
    assert.equal((await review(2, id, 3, "approved")).status, 409);
    assert.equal((await send(0, id, 4)).status, 409);
    const published = (await (await GET(req("/api/submissions"))).json()).items.find((s: { id: string }) => s.id === id);
    assert.ok(published); assert.equal(published.user_id, undefined); assert.equal(published.review_note, undefined); assert.equal(published.payload.nutrition, "");
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM catalog_items WHERE id=$1", ["submission-" + id])).rows[0].n, 1);
    const recipePayload = { ...payload, kind: "recipe" as const, productUrl: "", ingredients: "두부 100g", instructions: "팬에 익혀 주세요" };
    const recipeResponse = await send(0, undefined, undefined, recipePayload); assert.equal(recipeResponse.status, 201);
    const recipeId = (await recipeResponse.json()).id; submitted.push(recipeId);
    const recipeApproval = await PUT(new NextRequest("http://localhost:3000/api/admin/submissions", { method: "PUT", headers: { cookie: cookies[2], "Content-Type": "application/json" }, body: JSON.stringify({ id: recipeId, version: 1, status: "approved", payload: recipePayload }) }));
    assert.equal(recipeApproval.status, 200);
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM catalog_items WHERE id=$1", ["submission-" + recipeId])).rows[0].n, 0);
    assert.ok((await (await GET(req("/api/submissions"))).json()).items.some((s: { id: string }) => s.id === recipeId));
    const pending = await send(0); const pendingId = (await pending.json()).id; submitted.push(pendingId);
    await pool.query("UPDATE submissions SET photo_path='private-test' WHERE id=$1", [pendingId]);
    assert.equal((await photoGet(req("/api/submissions/photo?id=" + pendingId))).status, 404);
    assert.equal((await photoGet(req("/api/submissions/photo?id=" + pendingId, cookies[1]))).status, 404);
    assert.equal((await review(2, pendingId, 1, "rejected", "원문 확인 필요")).status, 200);
    assert.ok(!(await (await GET(req("/api/submissions"))).json()).items.some((s: { id: string }) => s.id === pendingId));
  } finally {
    if (adminBefore === undefined) delete process.env.ADMIN_EMAILS; else process.env.ADMIN_EMAILS = adminBefore;
    await pool.query("DELETE FROM users WHERE id=ANY($1::bigint[])", [users]);
    await pool.query("DELETE FROM catalog_items WHERE id=ANY($1::text[])", [submitted.map(id => "submission-" + id)]);
    await pool.end();
  }
});
