import {NextRequest} from 'next/server';
import {adminUser} from '../../../../../lib/admin';
import {searchFoodSafetyNutrition,searchLocalFoodSafety,localFoodSafetyCount,foodSafetyConfigured} from '../../../../../lib/foodsafety-collector';
export const maxDuration=30;

export async function GET(request:NextRequest){
 if(!await adminUser(request))return Response.json({error:'관리자 권한이 필요해요.'},{status:403});
 return Response.json({apiConfigured:foodSafetyConfigured(),localCount:await localFoodSafetyCount()},{headers:{'Cache-Control':'no-store'}});
}

export async function POST(r:NextRequest){
 if(r.headers.get('origin')!==new URL(r.url).origin||!await adminUser(r))return Response.json({error:'관리자 권한이 필요해요.'},{status:403});
 let keyword='';
 try{const raw=await r.text();if(raw.length>200)throw new Error();const body=JSON.parse(raw);if(typeof body.keyword!=='string'||!body.keyword.trim()||body.keyword.length>60)throw new Error();keyword=body.keyword.trim();}
 catch{return Response.json({error:'검색어를 확인해 주세요.'},{status:400});}
 try{
  const local=await searchLocalFoodSafety(keyword,15);
  let live:Awaited<ReturnType<typeof searchFoodSafetyNutrition>>=[];
  if(foodSafetyConfigured()){try{live=await searchFoodSafetyNutrition(keyword,10);}catch{/* Live API is a bonus on top of the local snapshot; ignore its failures. */}}
  const seen=new Set(local.map(m=>m.foodCode));
  const matches=[...local,...live.filter(m=>!seen.has(m.foodCode))];
  return Response.json({matches},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'영양정보 조회에 실패했어요.'},{status:503});}
}
