import { catalogItems } from "../lib/catalog-db";
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { GET, POST } from "../app/api/meal-plans/route";
import { GET as profileGET } from "../app/api/profile/route";
import { createSession, SESSION_COOKIE, type PublicUser } from "../lib/auth";
import { getPool } from "../lib/db";
import { defaultDiet, recommendMeals } from "../lib/meal-plan";
import type { BodyProfile } from "../lib/body-profile";
const profile: BodyProfile = {height:165,weight:60,age:28,sex:"female",activity:"light",meals:2,pregnancy:false};
const input = {profile,diet:{...defaultDiet,fasting:"16:8" as const,start:12},variant:0};
const request = (cookie = "", body?: unknown, origin = "http://localhost:3000") => new NextRequest("http://localhost:3000/api/meal-plans", {
  method:body===undefined?"GET":"POST",headers:{origin,Cookie:cookie,"Content-Type":"application/json"},
  ...(body===undefined?{}:{body:JSON.stringify(body)}),
});
test("server recommendations, persistence, input validation and account isolation", async () => {
  const pool=getPool(); const ids:string[]=[];
  try {
    assert.equal((await GET(request())).status,401);
    const preview=await POST(request("",input));
    assert.equal(preview.status,200);
    const previewData=await preview.json();
    assert.equal(previewData.saved,false);
    assert.equal(previewData.plan.id,null);
    assert.deepEqual(previewData.plan.recommendation,recommendMeals(profile,input.diet,0,await catalogItems()));
    for(const invalid of [{...input,variant:-1},{...input,variant:1.5},{...input,profile:{...profile,age:1}},{...input,diet:{...input.diet,start:99}},null])
      assert.equal((await POST(request("",invalid))).status,400);
    assert.equal((await POST(request("",input,"https://untrusted.example"))).status,403);
    assert.equal((await POST(request("",{...input,profile:{...profile,pregnancy:true}}))).status,422);
    const cookies:string[]=[];
    for(let i=0;i<2;i++) {
      const user=(await pool.query<PublicUser>("INSERT INTO users(name,email) VALUES ('식단 API 테스트',$1) RETURNING id::text,name,email",[`meal-${randomBytes(8).toString("hex")}@example.test`])).rows[0];
      ids.push(user.id);cookies.push(`${SESSION_COOKIE}=${(await createSession(user)).cookies.get(SESSION_COOKIE)!.value}`);
    }
    const created=await POST(request(cookies[0],{...input,user_id:ids[1],recommendation:{target:1}}));
    assert.equal(created.status,201);
    const saved=await created.json();
    assert.equal(saved.saved,true);
    assert.ok(saved.plan.id);
    assert.equal(saved.plan.recommendation.target,1829);
    const history=await (await GET(request(cookies[0]))).json();
    assert.deepEqual(history.plans[0],saved.plan);
    assert.deepEqual((await (await GET(request(cookies[1]))).json()).plans,[]);
    const storedProfile=await (await profileGET(request(cookies[0]))).json();
    assert.deepEqual(storedProfile.profile,profile);
    assert.deepEqual(storedProfile.diet,input.diet);
    const alternative=await (await POST(request(cookies[0],{...input,variant:1}))).json();
    const refreshed=await (await GET(request(cookies[0]))).json();
    assert.equal(refreshed.plans.length,2);
    assert.equal(refreshed.plans[0].id,alternative.plan.id);
    assert.notEqual(alternative.plan.recommendation.meals[0].name,saved.plan.recommendation.meals[0].name);
    // Each history item retains its original inputs after later profile updates.
    assert.deepEqual(refreshed.plans[1].profile,profile);
  } finally {
    await pool.query("DELETE FROM users WHERE id = ANY($1::bigint[])",[ids]);
    await pool.end();
  }
});
