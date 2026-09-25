import {menuQuality, qualityAllowsRecommendation} from '../../../../../lib/menu-quality';
import {NextRequest} from 'next/server';
import {adminUser} from '../../../../../lib/admin';
import {sameOrigin} from '../../../../../lib/auth';
import {getPool} from '../../../../../lib/db';
import {chooseMenuPhoto} from '../../../../../lib/admin-menu-photo';
export const maxDuration=60;
export async function POST(request:NextRequest) {
 if (!sameOrigin(request) || !await adminUser(request)) return Response.json({error:'관리자 권한이 필요해요.'},{status:403});
 const input=await request.json().catch(()=>null);
 if(typeof input?.code!=='string' || input.code.length>150) return Response.json({error:'메뉴를 확인해 주세요.'},{status:400});
 const client=await getPool().connect();
 try {
  await client.query('BEGIN');
  const {rows}=await client.query('SELECT target_name,image_url,ai_ingredients FROM recipe_optimizer_results WHERE food_code=$1 FOR UPDATE NOWAIT',[input.code]);
  if(!rows.length) {await client.query('ROLLBACK'); return Response.json({error:'메뉴를 찾지 못했어요.'},{status:404});}
  const quality=menuQuality(input.code,rows[0].target_name,rows[0].ai_ingredients?.ingredients??[]);
  if(!qualityAllowsRecommendation(quality)){await client.query('ROLLBACK');return Response.json({error:'메뉴 이름과 재료부터 검토해 주세요. '+quality.reason},{status:422});}
  const result=await chooseMenuPhoto(quality.name,rows[0].image_url);
  if(result.image) await client.query('UPDATE recipe_optimizer_results SET image_url=$1,image_urls=$2::jsonb WHERE food_code=$3',[result.image,JSON.stringify([result.image]),input.code]);
  await client.query('COMMIT');
  return Response.json({...result,changed:!!result.image},{headers:{'Cache-Control':'no-store'}});
 } catch(error) {
  await client.query('ROLLBACK');
  const busy=(error as {code?:string}).code==='55P03';
  return Response.json({error:busy?'이미 이 메뉴의 사진을 검수하고 있어요.':'사진을 교체하지 못했어요. 잠시 후 다시 시도해 주세요.'},{status:busy?409:502});
 } finally {client.release();}
}
