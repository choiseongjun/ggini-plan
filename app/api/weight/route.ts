import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,sameOrigin,authFailure} from '../../../lib/auth';
import {getPool} from '../../../lib/db';
import {emptyDashboard} from '../../../lib/dashboard';
export const runtime='nodejs';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const validDay=(s:unknown):s is string=>typeof s==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;

async function list(userId:string|number){
 const rows=(await getPool().query(`SELECT to_char(day,'YYYY-MM-DD') AS day,weight_kg::float8 AS weight FROM weight_logs WHERE user_id=$1 AND day>=CURRENT_DATE-180 ORDER BY day`,[userId])).rows;
 return json({logs:rows});
}

export async function GET(request:NextRequest){
 try{const user=await sessionUser(request);if(!user)return authFailure('로그인하면 체중을 기록할 수 있어요.',401);return await list(user.id);}
 catch{return authFailure('체중 기록을 불러오지 못했어요.',503);}
}

// 하루 1건. 같은 날 다시 입력하면 덮어쓰고, 오늘 기록이면 마이페이지 몸무게(칼로리 계산 기준)도 함께 바꾼다.
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  let input;try{input=await request.json();}catch{return authFailure('입력을 확인해 주세요.',400);}
  const today=emptyDashboard().today,day=input?.day??today,weight=Number(input?.weight);
  if(!validDay(day)||day>today||!Number.isFinite(weight)||weight<25||weight>350)return authFailure('체중(25~350kg)과 날짜를 확인해 주세요.',400);
  const kg=Math.round(weight*10)/10;
  await getPool().query('INSERT INTO weight_logs(user_id,day,weight_kg) VALUES($1,$2,$3) ON CONFLICT(user_id,day) DO UPDATE SET weight_kg=EXCLUDED.weight_kg,created_at=NOW()',[user.id,day,kg]);
  if(day===today&&kg>=30)await getPool().query('UPDATE body_profiles SET weight=$2,updated_at=NOW() WHERE user_id=$1',[user.id,kg]);
  return await list(user.id);
 }catch{return authFailure('체중을 저장하지 못했어요.',503);}
}

export async function DELETE(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  const day=request.nextUrl.searchParams.get('day');if(!validDay(day))return authFailure('날짜를 확인해 주세요.',400);
  await getPool().query('DELETE FROM weight_logs WHERE user_id=$1 AND day=$2',[user.id,day]);
  return await list(user.id);
 }catch{return authFailure('체중 기록을 지우지 못했어요.',503);}
}
