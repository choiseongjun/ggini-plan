import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,sameOrigin,authFailure} from '../../../lib/auth';
import {marketContext,userRegion,RegionError} from '../../../lib/regional-db';
import {validTimeZone} from '../../../lib/regional';
import {getPool} from '../../../lib/db';
export const runtime='nodejs';
const json=(data:unknown)=>NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
export async function GET(request:NextRequest){
 try{const user=await sessionUser(request);return json({region:user?await userRegion(user.id):await marketContext(),legacyUiMarket:'KR'});}catch{return authFailure('Region unavailable',503);}
}
export async function PUT(request:NextRequest){
 if(!sameOrigin(request))return authFailure('Invalid origin',403);
 try{
  const user=await sessionUser(request);if(!user)return authFailure('Login required',401);
  const input=await request.json().catch(()=>null);
  if(!input||typeof input.market!=='string'||typeof input.locale!=='string'||!validTimeZone(input.timeZone))return authFailure('Invalid region settings',400);
  const region=await marketContext(input.market,input.locale);region.timeZone=input.timeZone;
  await getPool().query('INSERT INTO user_regions(user_id,market_code,locale_code,time_zone) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET market_code=EXCLUDED.market_code,locale_code=EXCLUDED.locale_code,time_zone=EXCLUDED.time_zone,updated_at=NOW()',[user.id,region.market,region.locale,region.timeZone]);
  return json({region,legacyUiMarket:'KR'});
 }catch(e){return authFailure(e instanceof RegionError?e.message:'Region settings unavailable',e instanceof RegionError?400:503);}
}
