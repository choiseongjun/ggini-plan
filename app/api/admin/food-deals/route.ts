import {randomUUID} from 'node:crypto';
import {NextRequest} from 'next/server';
import {adminUser} from '../../../../lib/admin';
import {getPool} from '../../../../lib/db';
import {foodDeals} from '../../../../lib/food-deals-db';
import {parseDeal} from '../../../../lib/food-deals';
export async function GET(request:NextRequest){try{if(!await adminUser(request))return Response.json({error:'관리자 로그인이 필요해요.'},{status:403});return Response.json({items:await foodDeals(true)},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'핫딜을 불러오지 못했어요.'},{status:503});}}
export async function POST(request:NextRequest){
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'요청 출처를 확인해 주세요.'},{status:403});
 try{
  if(!await adminUser(request))return Response.json({error:'관리자 로그인이 필요해요.'},{status:403});
  const raw=await request.text();if(raw.length>12000)return Response.json({error:'입력 내용이 너무 길어요.'},{status:413});
  let p;try{p=parseDeal(JSON.parse(raw));}catch{return Response.json({error:'입력 형식이 올바르지 않아요.'},{status:400});}
  if(!p)return Response.json({error:'필수 항목·금액·HTTPS 링크를 확인해 주세요. 공개하려면 원문 확인에 체크하고 종료일을 확인해 주세요.'},{status:400});
  if(p.product_id){const r=await getPool().query("SELECT id FROM catalog_items WHERE id=$1 AND market_code='KR' AND currency_code='KRW'",[p.product_id]);if(!r.rowCount)return Response.json({error:'연결할 한국 상품을 선택해 주세요.'},{status:400});}
  const id=p.id??randomUUID();
  await getPool().query(`INSERT INTO food_deals(id,title,food_type,source_name,source_url,product_url,price,shipping,pack,conditions,product_id,status,checked_at,ends_at)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,CASE WHEN $12='live' THEN now() ELSE NULL END,$13)
   ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,food_type=EXCLUDED.food_type,source_name=EXCLUDED.source_name,source_url=EXCLUDED.source_url,product_url=EXCLUDED.product_url,price=EXCLUDED.price,shipping=EXCLUDED.shipping,pack=EXCLUDED.pack,conditions=EXCLUDED.conditions,product_id=EXCLUDED.product_id,status=EXCLUDED.status,checked_at=CASE WHEN EXCLUDED.status='live' THEN now() ELSE food_deals.checked_at END,ends_at=EXCLUDED.ends_at,updated_at=now()`,[id,p.title,p.food_type,p.source_name,p.source_url,p.product_url,p.price,p.shipping,p.pack,p.conditions,p.product_id,p.status,p.ends_at]);
  return Response.json({saved:true,id});
 }catch(e){if((e as {code?:string}).code==='23505')return Response.json({error:'이미 등록된 원문 링크예요. 기존 핫딜을 수정해 주세요.'},{status:409});return Response.json({error:'핫딜을 저장하지 못했어요.'},{status:503});}
}
