import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,sameOrigin,authFailure} from '../../../lib/auth';
import {getPool} from '../../../lib/db';
import {DEFAULT_WATER_TIMES,parseWaterReminder} from '../../../lib/water-reminder';
export const runtime='nodejs';
const json=(data:unknown)=>NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
export async function GET(request:NextRequest){
  try{
    const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
    const result=await getPool().query('SELECT enabled,times FROM water_reminders WHERE user_id=$1',[user.id]);
    return json(result.rows[0]??{enabled:false,times:DEFAULT_WATER_TIMES});
  }catch{return authFailure('물 알림 설정을 불러오지 못했어요.',503);}
}
export async function PUT(request:NextRequest){
  if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
  try{
    const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
    const value=parseWaterReminder(await request.json().catch(()=>null));
    if(!value)return authFailure('오전 6시~오후 10시 사이, 1시간 이상 간격으로 최대 6개 시간을 선택해 주세요.',400);
    await getPool().query(`INSERT INTO water_reminders(user_id,enabled,times) VALUES($1,$2,$3::jsonb)
      ON CONFLICT(user_id) DO UPDATE SET enabled=EXCLUDED.enabled,times=EXCLUDED.times,updated_at=NOW()`,[user.id,value.enabled,JSON.stringify(value.times)]);
    return json(value);
  }catch{return authFailure('물 알림 설정을 저장하지 못했어요.',503);}
}
