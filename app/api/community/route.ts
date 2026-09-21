import { NextRequest, NextResponse } from "next/server";
import { authFailure, sameOrigin, sessionUser } from "../../../lib/auth";
import { getPool } from "../../../lib/db";
import { catalogItems } from "../../../lib/catalog-db";
import { defaultDiet, dietStyles, parseDiet, recommendMeals } from "../../../lib/meal-plan";
import { parseBodyProfile } from "../../../lib/body-profile";
import { planProducts } from "../../../lib/shopping-plan-catalog";
import { createSharedPlan } from "../../../lib/shared-plan";
import { validatedPhoto } from "../../../lib/nutrition-photo";
import { uploadCommunityPhoto } from "../../../lib/community-storage";
import type { SharedItem } from "../../../lib/community";
export const runtime = "nodejs";
const json = (data:unknown,status=200) => NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
const today = "(NOW() AT TIME ZONE 'Asia/Seoul')::date";
const week = "date_trunc('week', NOW() AT TIME ZONE 'Asia/Seoul')::date";
const validText = (x:unknown,max:number): x is string => typeof x === "string" && x.trim().length > 0 && x.trim().length <= max;
const validId = (x:unknown): x is string => typeof x === "string" && /^[1-9][0-9]{0,17}$/.test(x);
export const communityPageSize = 10;
export async function GET(request:NextRequest) {
 try {
  const user = await sessionUser(request); const uid=user?.id ?? null; const db=getPool();
  const before = request.nextUrl.searchParams.get("before");
  const beforeId = validId(before) ? before : null;
  const limitParam = Number(request.nextUrl.searchParams.get("limit"));
  const limit = Number.isInteger(limitParam) && limitParam>=1 && limitParam<=300 ? limitParam : communityPageSize;
  const params:(string|number|null)[] = [uid];
  let where = "";
  if(beforeId){ params.push(beforeId); where = `WHERE p.id<$${params.length}`; }
  params.push(limit);
  const results = await Promise.all([
   db.query(`SELECT p.id::text,p.alias,p.title,p.body,p.items,p.style,p.created_at AS "createdAt",COALESCE(p.user_id=$1,false) AS mine,
     p.photo_path IS NOT NULL AS "hasPhoto",
     sp.snapshot AS plan,
     (SELECT COUNT(*)::int FROM community_likes l WHERE l.post_id=p.id) AS likes,
     EXISTS(SELECT 1 FROM community_likes l WHERE l.post_id=p.id AND l.user_id=$1) AS liked,
     COALESCE((SELECT jsonb_agg(tip) FROM (SELECT t.id::text,t.alias,t.body,COALESCE(t.user_id=$1,false) AS mine FROM community_tips t WHERE t.post_id=p.id ORDER BY t.created_at DESC LIMIT 30) tip),'[]'::jsonb) AS tips
     FROM community_posts p LEFT JOIN shared_shopping_plans sp ON sp.id=p.plan_id ${where} ORDER BY p.created_at DESC,p.id DESC LIMIT $${params.length}`,params),
   db.query(`SELECT c.*,EXISTS(SELECT 1 FROM challenge_members m WHERE m.challenge_id=c.id AND m.user_id=$1 AND m.week_start=${week}) AS joined,
     (SELECT COUNT(*)::int FROM challenge_checks k WHERE k.challenge_id=c.id AND k.user_id=$1 AND k.checked_on BETWEEN ${week} AND ${today}) AS progress,
     EXISTS(SELECT 1 FROM challenge_checks k WHERE k.challenge_id=c.id AND k.user_id=$1 AND k.checked_on=${today}) AS checked,
     (SELECT COUNT(*)::int FROM challenge_members m WHERE m.challenge_id=c.id AND m.week_start=${week}) AS members
     FROM community_challenges c ORDER BY c.id`,[uid]),
   db.query(`SELECT items,budget FROM community_baskets WHERE user_id=$1`,[uid]),
   db.query(`SELECT to_char(${week},'YYYY-MM-DD') AS week`),
  ]);
  return json({posts:results[0].rows,challenges:results[1].rows,basket:results[2].rows[0]??null,week:results[3].rows[0].week,pageSize:communityPageSize});
 } catch { return authFailure("함께하는 소식을 불러오지 못했어요.",503); }
}
export async function POST(request:NextRequest) {
 if(!sameOrigin(request)) return authFailure("요청을 확인해 주세요.",403);
 try {
  const user=await sessionUser(request); if(!user) return authFailure("로그인 후 이용해 주세요.",401);
  const isMultipart=request.headers.get("content-type")?.includes("multipart/form-data");
  let p:Record<string,unknown>,photo:{bytes:Buffer;mime:string}|null=null;
  if(isMultipart){
   const form=await request.formData();
   try{p=JSON.parse(String(form.get("payload")));}catch{return authFailure("입력을 확인해 주세요.",400);}
   try{photo=await validatedPhoto(form.get("photo"));}catch(e){return authFailure(e instanceof Error?e.message:"사진을 확인해 주세요.",400);}
  }else{
   try{p=await request.json();}catch{return authFailure("입력을 확인해 주세요.",400);}
  }
  if(!p || typeof p !== "object") return authFailure("입력을 확인해 주세요.",400);
  const db=getPool();
  if(p.action === "share") {
   if(!validText(p.alias,24)||!validText(p.title,80)||!validText(p.body,1000)||typeof p.style!=="string"||!Object.hasOwn(dietStyles,p.style)) return authFailure("별명, 제목, 후기를 확인해 주세요.",400);
   let items:SharedItem[],planId:string|null=null;
   if(p.conditions!==undefined||p.mealIds!==undefined){
    const products=await planProducts();
    const created=await createSharedPlan(user.id,p.conditions,p.mealIds,products);
    if(!created) return authFailure("식단 조건을 확인해 주세요.",400);
    const usedIds=new Set(created.snapshot.meals.map(m=>m.productId));
    items=products.filter(i=>usedIds.has(i.id)).map(({id,name,price,emoji,detail})=>({id,name,price,emoji,detail}));
    planId=created.id;
   } else {
    if(!Array.isArray(p.items)||p.items.length<1||p.items.length>20||p.items.some((x:unknown)=>typeof x!=="string")) return authFailure("공유할 재료를 확인해 주세요.",400);
    const catalog=await catalogItems(); const ids=new Set(p.items); items=catalog.filter(i=>ids.has(i.id)).map(({id,name,price,emoji,detail})=>({id,name,price,emoji,detail}));
    if(items.length!==ids.size) return authFailure("선택한 상품을 확인해 주세요.",400);
   }
   const photoPath=photo?await uploadCommunityPhoto(photo):null;
   const row=await db.query(`INSERT INTO community_posts(user_id,alias,title,body,items,style,plan_id,photo_path) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id::text`,[user.id,(p.alias as string).trim(),(p.title as string).trim(),(p.body as string).trim(),JSON.stringify(items),p.style,planId,photoPath]);
   return json({id:row.rows[0].id},201);
  }
  if(p.action === "like" || p.action === "tip" || p.action === "delete-post" || p.action === "adopt") {
   if(!validId(p.postId)) return authFailure("게시글을 확인해 주세요.",400);
   const post=(await db.query("SELECT * FROM community_posts WHERE id=$1",[p.postId])).rows[0];
   if(!post) return authFailure("삭제되었거나 없는 게시글이에요.",404);
   if(p.action === "delete-post") { const deleted=await db.query("DELETE FROM community_posts WHERE id=$1 AND user_id=$2 RETURNING id",[p.postId,user.id]); return deleted.rowCount?json({ok:true}):authFailure("내 게시글만 삭제할 수 있어요.",403); }
   if(p.action === "like") {
    if(typeof p.liked!=="boolean") return authFailure("반응을 확인해 주세요.",400);
    if(p.liked) await db.query("INSERT INTO community_likes(post_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[p.postId,user.id]);
    else await db.query("DELETE FROM community_likes WHERE post_id=$1 AND user_id=$2",[p.postId,user.id]);
    return json({ok:true});
   }
   if(p.action === "tip") {
    if(!validText(p.alias,24)||!validText(p.body,500)) return authFailure("별명과 대체·소분 팁을 입력해 주세요.",400);
    await db.query("INSERT INTO community_tips(post_id,user_id,alias,body) VALUES($1,$2,$3,$4)",[p.postId,user.id,p.alias.trim(),p.body.trim()]);return json({ok:true},201);
   }
   const budget=Number(p.budget);
   if(!Number.isInteger(budget)||budget<1000||budget>10000000) return authFailure("장보기 예산을 확인해 주세요.",400);
   const row=(await db.query("SELECT * FROM body_profiles WHERE user_id=$1",[user.id])).rows[0];
   const profile=parseBodyProfile(row); if(!profile) return authFailure("마이에서 신체 정보와 식단 취향을 먼저 저장해 주세요.",422);
   const diet=parseDiet(row.diet_preferences)??defaultDiet;
   const recommendation=recommendMeals(profile,diet,0,await catalogItems());if(!recommendation) return authFailure("현재 신체 상태에서는 자동 식단을 구성할 수 없어요.",422);
   const allergens:Record<string,string>={chicken:"chicken",eggs:"egg",tofu:"soy",yogurt:"milk"};
   const plantIngredients=new Set(["rice","tofu","banana","broccoli","oats"]);
   const sourceIds=new Set((post.items as SharedItem[]).map(i=>i.id));
   const candidates=(await catalogItems()).filter(i=>sourceIds.has(i.id)&&!diet.excluded.some(x=>x===allergens[i.id]||i.allergens?.includes(x))&&(diet.style!=="plant"||plantIngredients.has(i.id))).sort((a,b)=>a.price-b.price);
   const items:SharedItem[]=[];let total=0;
   for(const item of candidates) if(total+item.price<=budget){items.push({id:item.id,name:item.name,price:item.price,emoji:item.emoji,detail:item.detail});total+=item.price;}
   if(!items.length) return authFailure("예산과 제외 재료를 반영하면 담을 상품이 없어요. 예산을 바꾸거나 다른 장바구니를 골라 주세요.",422);
   const client=await db.connect();
   try {
    await client.query("BEGIN");
    await client.query(`INSERT INTO community_baskets(user_id,source_post_id,items,budget) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET source_post_id=EXCLUDED.source_post_id,items=EXCLUDED.items,budget=EXCLUDED.budget,updated_at=NOW()`,[user.id,p.postId,JSON.stringify(items),budget]);
    await client.query(`INSERT INTO meal_plans(user_id,profile_snapshot,diet_snapshot,recommendation,variant) VALUES($1,$2,$3,$4,0)`,[user.id,JSON.stringify(profile),JSON.stringify(diet),JSON.stringify(recommendation)]);
    await client.query("COMMIT");
   } catch(error){await client.query("ROLLBACK");throw error;} finally{client.release();}
   return json({items,total,removed:sourceIds.size-items.length,target:recommendation.target,message:"예산과 제외 재료를 반영해 저장했어요. 내 칼로리에 맞춘 식단은 마이에서 볼 수 있어요. 이 장바구니만으로 식단 재료가 모두 충족되지는 않아요."});
  }
  if(p.action === "delete-tip") {
   if(!validId(p.tipId)) return authFailure("팁을 확인해 주세요.",400);
   const row=await db.query("DELETE FROM community_tips WHERE id=$1 AND user_id=$2 RETURNING id",[p.tipId,user.id]);return row.rowCount?json({ok:true}):authFailure("내 팁만 삭제할 수 있어요.",403);
  }
  if(p.action === "join" || p.action === "check") {
   if(typeof p.challengeId!=="string") return authFailure("챌린지를 확인해 주세요.",400);
   const challenge=(await db.query("SELECT * FROM community_challenges WHERE id=$1",[p.challengeId])).rows[0];if(!challenge) return authFailure("없는 챌린지예요.",404);
   if(p.action === "join") await db.query(`INSERT INTO challenge_members(user_id,challenge_id,week_start) VALUES($1,$2,${week}) ON CONFLICT DO NOTHING`,[user.id,p.challengeId]);
   else {
    if(typeof p.checked!=="boolean") return authFailure("기록을 확인해 주세요.",400);
    const member=await db.query(`SELECT 1 FROM challenge_members WHERE user_id=$1 AND challenge_id=$2 AND week_start=${week}`,[user.id,p.challengeId]);
    if(!member.rowCount)return authFailure("챌린지에 먼저 참여해 주세요.",409);
    if(p.checked) await db.query(`INSERT INTO challenge_checks(user_id,challenge_id,checked_on) VALUES($1,$2,${today}) ON CONFLICT DO NOTHING`,[user.id,p.challengeId]);
    else await db.query(`DELETE FROM challenge_checks WHERE user_id=$1 AND challenge_id=$2 AND checked_on=${today}`,[user.id,p.challengeId]);
   }
   return json({ok:true});
  }
  return authFailure("지원하지 않는 요청이에요.",400);
 } catch { return authFailure("저장하지 못했어요. 다시 시도해 주세요.",503); }
}
