import {NextRequest} from 'next/server';
import {adminUser} from '../../../../../lib/admin';
import {collectFoodDeals,collectionStatus,CollectionBusy} from '../../../../../lib/food-deal-collector';
import {getPool} from '../../../../../lib/db';
export const maxDuration=60;
export async function GET(r:NextRequest){if(!await adminUser(r))return Response.json({error:'관리자 로그인이 필요해요.'},{status:403});return Response.json(await collectionStatus(),{headers:{'Cache-Control':'no-store'}});}
export async function POST(r:NextRequest){
 if(r.headers.get('origin')!==new URL(r.url).origin||!await adminUser(r))return Response.json({error:'관리자 권한이 필요해요.'},{status:403});
 try{return Response.json(await collectFoodDeals('admin'));}catch(e){return Response.json({error:e instanceof Error?e.message:'수집 실패'},{status:e instanceof CollectionBusy?409:503});}
}
export async function PATCH(r:NextRequest){
 if(r.headers.get('origin')!==new URL(r.url).origin||!await adminUser(r))return Response.json({error:'관리자 권한이 필요해요.'},{status:403});
 const raw=await r.text();if(raw.length>100)return Response.json({error:'잘못된 설정'}, {status:400});
 let enabled;try{enabled=JSON.parse(raw).enabled;}catch{}
 if(typeof enabled!=='boolean')return Response.json({error:'잘못된 설정'},{status:400});
 await getPool().query('UPDATE food_deal_collection_settings SET enabled=$1 WHERE id=true',[enabled]);return Response.json({enabled});
}
