import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { calorieEstimate, parseBodyProfile, type BodyProfile } from "../lib/body-profile";
import { GET, PUT } from "../app/api/profile/route";
import { createSession, SESSION_COOKIE, type PublicUser } from "../lib/auth";
import { getPool } from "../lib/db";

const example: BodyProfile = { height: 165, weight: 60, age: 28, sex: "female", activity: "light", meals: 3, pregnancy: false };
test("energy formula, activity changes and invalid inputs", () => {
  assert.deepEqual(calorieEstimate(example), { resting: 1330, daily: 1829, perMeal: 610 });
  assert.equal(calorieEstimate({ ...example, sex: "male" })?.resting, 1496);
  assert.ok(calorieEstimate({ ...example, activity: "active" })!.daily > calorieEstimate(example)!.daily);
  assert.equal(calorieEstimate({ ...example, pregnancy: true }), null);
  for (const p of [{ ...example, weight: NaN }, { ...example, age: 15 }, { ...example, meals: 0 }, { ...example, activity: "__proto__" }]) assert.equal(parseBodyProfile(p), null);
});

test("profile requires login, persists changes and keeps accounts separate", async () => {
  const pool = getPool();
  const ids: string[] = [];
  const origin = "http://localhost:3000";
  const request = (cookie = "", body?: unknown) => new NextRequest(`${origin}/api/profile`, {
    method: body ? "PUT" : "GET", headers: { origin, Cookie: cookie, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  try {
    assert.equal((await GET(request())).status, 401);
    const cookies: string[] = [];
    for (let i = 0; i < 2; i++) {
      const row = (await pool.query<PublicUser>("INSERT INTO users(name,email) VALUES ('신체정보 테스트',$1) RETURNING id::text AS id,name,email", [`body-${randomBytes(8).toString("hex")}@example.test`])).rows[0];
      ids.push(row.id);
      cookies.push(`${SESSION_COOKIE}=${(await createSession(row)).cookies.get(SESSION_COOKIE)!.value}`);
    }
    assert.equal((await PUT(request(cookies[0], { ...example, age: 10 }))).status, 400);
    assert.equal((await PUT(request(cookies[0], example))).status, 200);
    assert.deepEqual((await (await GET(request(cookies[0]))).json()).profile, example);
    assert.equal((await (await GET(request(cookies[1]))).json()).profile, null);
    const diet = { style: "plant", fasting: "16:8", start: 12, excluded: ["soy"] };
    assert.equal((await PUT(request(cookies[0], { ...example, diet }))).status, 200);
    assert.deepEqual((await (await GET(request(cookies[0]))).json()).diet, diet);
    assert.equal((await PUT(request(cookies[0], { ...example, diet: { ...diet, start: 25 } }))).status, 400);
    const changed = { ...example, weight: 62 };
    assert.equal((await PUT(request(cookies[0], changed))).status, 200);
    assert.deepEqual((await (await GET(request(cookies[0]))).json()).profile, changed);
    assert.deepEqual((await (await GET(request(cookies[0]))).json()).diet, diet);
  } finally {
    await pool.query("DELETE FROM users WHERE id = ANY($1::bigint[])", [ids]);
    await pool.end();
  }
});
