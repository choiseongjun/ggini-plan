import { NextRequest, NextResponse } from 'next/server';
import { sessionUser, sameOrigin, authFailure } from '../../../lib/auth';
import { getPool } from '../../../lib/db';
import { planProducts } from '../../../lib/shopping-plan-catalog';
import { parseConditions, validSwapPreferences, validMealIds, basketTotal } from '../../../lib/shopping-plan';
import {parseStock} from '../../../lib/shopping-progress';
import {personalizeProducts} from '../../../lib/shopping-personalization';
import {defaultDiet,parseDiet} from '../../../lib/meal-plan';
import {isShoppingGoal,isBudgetMode} from '../../../lib/shopping-goals';
import {validMealKinds} from '../../../lib/meal-kinds';
import {initialConditions} from '../../../lib/shopping-plan';
async function personalizedCatalog(userId?:string){
 const row=userId?(await getPool().query('SELECT height::float8,weight::float8,age,sex,activity,meals,pregnancy,diet_preferences,nutrition_target FROM body_profiles WHERE user_id=$1',[userId])).rows[0]:null;
 const catalog=await planProducts(),diet=parseDiet(row?.diet_preferences)??defaultDiet;
 const filtered=personalizeProducts(catalog,row,row?.diet_preferences,row?.nutrition_target);
 const base=personalizeProducts(catalog,row,{...diet,excluded:[]},row?.nutrition_target).products;
 // 프로필 제외 재료로 걸러진 목록을 따로 통째로 보내지 않는다(같은 메뉴 수백 개가 두 번 가서 응답이 13MB였다).
 // 전체 목록 한 번 + 걸러진 메뉴 id만 보내고, 제외 재료는 추천 조건에서 다시 적용된다.
 const visible=new Set(filtered.products.map(p=>p.id));
 return {personalization:filtered.personalization,products:base,filtered:filtered.products,profileHiddenIds:base.filter(p=>!visible.has(p.id)).map(p=>p.id),excluded:diet.excluded};
}
export const runtime='nodejs';
export async function PATCH(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  const raw=await request.text();if(raw.length>30000)return authFailure('음식 종류를 확인해 주세요.',400);
  let input;try{input=JSON.parse(raw);}catch{return authFailure('음식 종류를 확인해 주세요.',400);}
  if(input?.swapPreferences!==undefined&&!validSwapPreferences(input.swapPreferences))return authFailure('교체 의견을 확인해 주세요.',400);
  if(!input||typeof input!=='object'||Array.isArray(input)||!Object.keys(input).length||Object.keys(input).some(k=>!['mealKinds','goal','budgetMode','swapPreferences'].includes(k))||(input.mealKinds!==undefined&&!validMealKinds(input.mealKinds))||(input.goal!==undefined&&!isShoppingGoal(input.goal))||(input.budgetMode!==undefined&&!isBudgetMode(input.budgetMode)))return authFailure('음식 종류를 확인해 주세요.',400);
  await getPool().query(`INSERT INTO shopping_preferences(user_id,conditions) VALUES($1,$2::jsonb)
   ON CONFLICT(user_id) DO UPDATE SET conditions=shopping_preferences.conditions::jsonb || $3::jsonb,updated_at=now()`,[user.id,JSON.stringify({...initialConditions,...input}),JSON.stringify(input)]);
  return Response.json({saved:true},{headers:{'Cache-Control':'no-store'}});
 }catch{return authFailure('음식 종류를 저장하지 못했어요.',503);}
}
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:NextRequest){
 try{
  if(request.nextUrl.searchParams.get('saved')==='1'){
   const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
   const result=await getPool().query('SELECT conditions, meal_ids AS "mealIds", created_at AS "createdAt" FROM shopping_plans WHERE user_id=$1 ORDER BY id DESC LIMIT 1',[user.id]);
   return json({plan:result.rows[0]??null});
  }
  const user=await sessionUser(request);
  const resetAt=user?(await getPool().query('SELECT reset_at AS "resetAt" FROM user_data_resets WHERE user_id=$1',[user.id])).rows[0]?.resetAt:null;
  const preferences=user?(await getPool().query('SELECT conditions FROM shopping_preferences WHERE user_id=$1',[user.id])).rows[0]?.conditions:null;
  const plan=user?(await getPool().query('SELECT conditions,meal_ids AS "mealIds" FROM shopping_plans WHERE user_id=$1 ORDER BY id DESC LIMIT 1',[user.id])).rows[0]:null;
  const catalog=await personalizedCatalog(user?.id);
  return json({personalization:catalog.personalization,products:catalog.products,profileHiddenIds:catalog.profileHiddenIds,excluded:catalog.excluded,preferences:preferences??null,plan:plan??null,resetAt:resetAt??null});
 }catch{return authFailure('장보기 식단을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',503);}
}
export async function PUT(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  let input;try{input=await request.json();}catch{return authFailure('입력을 확인해 주세요.',400);}
  const conditions=parseConditions(input?.conditions);
  if(!conditions)return authFailure('예산과 챙길 끼니를 확인해 주세요.',400);
  conditions.owned=[];delete conditions.supply;
  await getPool().query('INSERT INTO shopping_preferences(user_id,conditions) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET conditions=EXCLUDED.conditions,updated_at=NOW()',[user.id,JSON.stringify(conditions)]);
  return json({saved:true,conditions});
 }catch{return authFailure('장보기 설정을 저장하지 못했어요. 다시 시도해 주세요.',503);}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  let input;try{input=await request.json();}catch{return authFailure('입력을 확인해 주세요.',400);}
  const c=parseConditions(input?.conditions), ids=input?.mealIds;
  if(!c||!Array.isArray(ids)||ids.length!==c.meals||ids.some(id=>typeof id!=='string'))return authFailure('식단 설정을 확인해 주세요.',400);
  const personalized=await personalizedCatalog(user.id);
  if(personalized.personalization.blocked)return authFailure('현재 신체 정보에서는 자동 맞춤 추천을 제공하지 않아요.',422);
  const stock=parseStock((await getPool().query("SELECT stock FROM shopping_progress WHERE user_id=$1 AND scope='products'",[user.id])).rows[0]?.stock??{})??{};
  c.supply=Object.fromEntries(Object.values(stock).map(i=>[i.id,i.owned+i.ordered]));
  const products=c.excluded===undefined?personalized.filtered:personalized.products;
  if(!validMealIds(ids,products,c)||basketTotal(ids,products,c.owned,c.supply,c.people)>c.budget)return authFailure('상품 또는 가격이 변경됐어요. 식단을 다시 추천받아 주세요.',409);
  await getPool().query('INSERT INTO shopping_plans(user_id,conditions,meal_ids) VALUES($1,$2,$3)',[user.id,JSON.stringify(c),JSON.stringify(ids)]);
  return json({saved:true},201);
 }catch{return authFailure('식단을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',503);}
}
