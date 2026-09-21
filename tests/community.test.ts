import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { GET, POST } from "../app/api/community/route";
import { PUT } from "../app/api/profile/route";
import { getPool } from "../lib/db";
import { createSession,SESSION_COOKIE,type PublicUser } from "../lib/auth";
import { planProducts } from "../lib/shopping-plan-catalog";
import { initialConditions, recommendShopping } from "../lib/shopping-plan";
const req=(cookie="",body?:unknown,origin="http://localhost:3000")=>new NextRequest("http://localhost:3000/api/community",{method:body===undefined?"GET":"POST",headers:{origin,Cookie:cookie,"Content-Type":"application/json"},...(body===undefined?{}:{body:JSON.stringify(body)})});
test("community sharing, privacy, ownership, reactions, adoption and weekly check-ins",async()=>{
 const pool=getPool(),ids:string[]=[];const cookies:string[]=[];
 try {
  assert.equal((await GET(req())).status,200);
  assert.equal((await POST(req("",{action:"share"}))).status,401);
  for(let i=0;i<2;i++){
   const u=(await pool.query<PublicUser>("INSERT INTO users(name,email) VALUES('비공개 실명',$1) RETURNING id::text,name,email",[`community-${randomBytes(8).toString("hex")}@example.test`])).rows[0];
   ids.push(u.id);cookies.push(`${SESSION_COOKIE}=${(await createSession(u)).cookies.get(SESSION_COOKIE)!.value}`);
  }
  const post=async(i:number,p:unknown)=>POST(req(cookies[i],p));
  assert.equal((await POST(req(cookies[0],{action:"join",challengeId:"home"},"https://wrong.example"))).status,403);
  assert.equal((await post(0,{action:"share",alias:"",title:"",items:[]})).status,400);
  const created=await post(0,{action:"share",alias:"테스트별명",title:"테스트 식탁",body:"공개 후기",style:"balanced",items:["chicken","tofu","rice"]});assert.equal(created.status,201);
  const {id:postId}=await created.json();
  const feed=await (await GET(req())).json();const published=feed.posts.find((p:{id:string})=>p.id===postId);
  assert.equal(published.alias,"테스트별명");assert.equal(JSON.stringify(published).includes("비공개 실명"),false);assert.equal(published.user_id,undefined);
  assert.equal((await post(1,{action:"delete-post",postId})).status,403);
  for(let i=0;i<2;i++)assert.equal((await post(1,{action:"like",postId,liked:true})).status,200);
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM community_likes WHERE post_id=$1",[postId])).rows[0].n,1);
  assert.equal((await post(1,{action:"tip",postId,alias:"콩좋아",body:"두부를 소분해요"})).status,201);
  const tipId=(await pool.query("SELECT id::text FROM community_tips WHERE post_id=$1",[postId])).rows[0].id;
  assert.equal((await post(0,{action:"delete-tip",tipId})).status,403);
  assert.equal((await post(1,{action:"adopt",postId,budget:40000})).status,422);
  const profile={height:165,weight:60,age:28,sex:"female",activity:"light",meals:2,pregnancy:false,diet:{style:"plant",fasting:"16:8",start:12,excluded:["soy"]}};
  assert.equal((await PUT(req(cookies[1],profile))).status,200);
  const adoption=await post(1,{action:"adopt",postId,budget:40000});assert.equal(adoption.status,200);const adopted=await adoption.json();
  assert.deepEqual(adopted.items.map((i:{id:string})=>i.id),["rice"]);assert.ok(adopted.total<=40000);assert.equal(adopted.target,1829);
  assert.equal((await (await GET(req(cookies[0]))).json()).basket,null);
  assert.deepEqual((await (await GET(req(cookies[1]))).json()).basket.items,adopted.items);
  assert.equal((await post(0,{action:"check",challengeId:"home",checked:true})).status,409);
  assert.equal((await post(0,{action:"join",challengeId:"home"})).status,200);
  for(let i=0;i<2;i++)assert.equal((await post(0,{action:"check",challengeId:"home",checked:true})).status,200);
  let c=(await (await GET(req(cookies[0]))).json()).challenges.find((c:{id:string})=>c.id==="home");assert.equal(c.progress,1);assert.equal(c.checked,true);
  assert.equal((await post(0,{action:"check",challengeId:"home",checked:false})).status,200);
  c=(await (await GET(req(cookies[0]))).json()).challenges.find((c:{id:string})=>c.id==="home");assert.equal(c.progress,0);
  assert.equal((await post(0,{action:"delete-post",postId})).status,200);
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM community_tips WHERE post_id=$1",[postId])).rows[0].n,0);
  assert.equal((await (await GET(req(cookies[1]))).json()).basket.items.length,1);
 }finally{await pool.query("DELETE FROM users WHERE id=ANY($1::bigint[])",[ids]);}
});
test("sharing a manually built plan attaches a plan snapshot; flat-item sharing stays unchanged",async()=>{
 const pool=getPool(),ids:string[]=[];const cookies:string[]=[];
 try{
  const user=(await pool.query<PublicUser>("INSERT INTO users(name,email) VALUES('플랜 테스트',$1) RETURNING id::text,name,email",[`community-plan-${randomBytes(8).toString("hex")}@example.test`])).rows[0];
  ids.push(user.id);cookies.push(`${SESSION_COOKIE}=${(await createSession(user)).cookies.get(SESSION_COOKIE)!.value}`);
  const post=async(p:unknown)=>POST(req(cookies[0],p));
  const products=await planProducts(),conditions={...initialConditions,days:2,meals:2},mealIds=recommendShopping(products,conditions)!;
  const created=await post({action:"share",alias:"플랜별명",title:"내 식단",body:"직접 만들었어요",style:"balanced",conditions,mealIds});
  assert.equal(created.status,201);
  const {id:postId}=await created.json();
  const feed=await (await GET(req())).json();
  const published=feed.posts.find((p:{id:string})=>p.id===postId);
  assert.ok(published.plan);
  assert.equal(published.plan.days,2);assert.equal(published.plan.meals.length,2);
  assert.deepEqual(published.items.map((i:{id:string})=>i.id).sort(),[...new Set(mealIds)].sort());
  const flat=await post({action:"share",alias:"플랜별명",title:"장바구니",body:"상품만 골랐어요",style:"balanced",items:[mealIds[0]]});
  assert.equal(flat.status,201);
  const {id:flatId}=await flat.json();
  const flatPost=(await (await GET(req())).json()).posts.find((p:{id:string})=>p.id===flatId);
  assert.equal(flatPost.plan,null);
 }finally{await pool.query("DELETE FROM users WHERE id=ANY($1::bigint[])",[ids]);await pool.end();}
});
