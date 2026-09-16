import { NextRequest, NextResponse } from 'next/server';
import { sessionUser, sameOrigin, authFailure } from '../../../lib/auth';
import { getPool } from '../../../lib/db';
import { planProducts } from '../../../lib/shopping-plan-catalog';
import { parseConditions, validMealIds, basketTotal } from '../../../lib/shopping-plan';
import {personalizeProducts} from '../../../lib/shopping-personalization';
async function personalizedCatalog(userId?:string){
 const row=userId?(await getPool().query('SELECT height::float8,weight::float8,age,sex,activity,meals,pregnancy,diet_preferences FROM body_profiles WHERE user_id=$1',[userId])).rows[0]:null;
 return personalizeProducts(await planProducts(),row,row?.diet_preferences);
}
export const runtime='nodejs';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:NextRequest){
 try{
  if(request.nextUrl.searchParams.get('saved')==='1'){
   const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
   const result=await getPool().query('SELECT conditions, meal_ids AS "mealIds", created_at AS "createdAt" FROM shopping_plans WHERE user_id=$1 ORDER BY id DESC LIMIT 1',[user.id]);
   return json({plan:result.rows[0]??null});
  }
  const user=await sessionUser(request);
  const preferences=user?(await getPool().query('SELECT conditions FROM shopping_preferences WHERE user_id=$1',[user.id])).rows[0]?.conditions:null;
  return json({...await personalizedCatalog(user?.id),preferences:preferences??null});
 }catch{return authFailure('장보기 식단을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',503);}
}
export async function PUT(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  let input;try{input=await request.json();}catch{return authFailure('입력을 확인해 주세요.',400);}
  const conditions=parseConditions(input?.conditions);
  if(!conditions)return authFailure('예산과 챙길 끼니를 확인해 주세요.',400);
  conditions.owned=[];
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
  const products=personalized.products;
  if(!validMealIds(ids,products,c)||basketTotal(ids,products,c.owned)>c.budget)return authFailure('상품 또는 가격이 변경됐어요. 식단을 다시 추천받아 주세요.',409);
  await getPool().query('INSERT INTO shopping_plans(user_id,conditions,meal_ids) VALUES($1,$2,$3)',[user.id,JSON.stringify(c),JSON.stringify(ids)]);
  return json({saved:true},201);
 }catch{return authFailure('식단을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',503);}
}
