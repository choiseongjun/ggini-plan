import { NextRequest, NextResponse } from 'next/server';
import { sessionUser, sameOrigin, authFailure } from '../../../lib/auth';
import { getPool } from '../../../lib/db';
import { planProducts } from '../../../lib/shopping-plan-catalog';
import { parseConditions, candidates, basketTotal } from '../../../lib/shopping-plan';
export const runtime='nodejs';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:NextRequest){
 try{
  if(request.nextUrl.searchParams.get('saved')==='1'){
   const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
   const result=await getPool().query('SELECT conditions, meal_ids AS "mealIds", created_at AS "createdAt" FROM shopping_plans WHERE user_id=$1 ORDER BY id DESC LIMIT 1',[user.id]);
   return json({plan:result.rows[0]??null});
  }
  return json({products:await planProducts()});
 }catch{return authFailure('장보기 식단을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',503);}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  let input;try{input=await request.json();}catch{return authFailure('입력을 확인해 주세요.',400);}
  const c=parseConditions(input?.conditions), ids=input?.mealIds;
  if(!c||!Array.isArray(ids)||ids.length!==c.meals||ids.some(id=>typeof id!=='string'))return authFailure('식단 설정을 확인해 주세요.',400);
  const products=await planProducts(), allowed=candidates(products,c);
  if(ids.some(id=>!allowed.some(p=>p.id===id))||basketTotal(ids,products,c.owned)>c.budget)return authFailure('상품 또는 가격이 변경됐어요. 식단을 다시 추천받아 주세요.',409);
  await getPool().query('INSERT INTO shopping_plans(user_id,conditions,meal_ids) VALUES($1,$2,$3)',[user.id,JSON.stringify(c),JSON.stringify(ids)]);
  return json({saved:true},201);
 }catch{return authFailure('식단을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',503);}
}
