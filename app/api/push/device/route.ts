import {createHash} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,SESSION_COOKIE} from '../../../../lib/auth';
import {getPool} from '../../../../lib/db';
import {nativeInput,DEFAULT_NATIVE_TIMES} from '../../../../lib/native-push-input';
import {fcmConfigured,sendFcm,invalidFcmToken} from '../../../../lib/fcm';
export const runtime='nodejs';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:NextRequest){
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'요청을 확인해 주세요.'},403);
 try{
  const user=await sessionUser(request);if(!user)return json({error:'로그인이 필요해요.'},401);
  const raw=await request.text();if(raw.length>6000)return json({error:'입력이 너무 길어요.'},400);
  let input;try{input=nativeInput(JSON.parse(raw));}catch{return json({error:'입력을 확인해 주세요.'},400);}
  if(!input)return json({error:'기기 정보를 확인해 주세요.'},400);
  if(input.expectedUserId!==user.id)return json({error:'로그인 계정이 변경되었어요.'},409);
  const db=getPool(),{deviceId,action}=input;
  if(action==='sync'){
   const hash=createHash('sha256').update(request.cookies.get(SESSION_COOKIE)!.value).digest('hex');
   await db.query(`INSERT INTO native_push_devices(device_id,user_id,session_hash,token,permission_granted)
    VALUES($1,$2,$3,$4,$5) ON CONFLICT(device_id) DO UPDATE SET
    times=CASE WHEN native_push_devices.user_id=EXCLUDED.user_id THEN native_push_devices.times ELSE '{"lunch":"12:00","dinner":"18:30"}'::jsonb END,
    enabled=CASE WHEN native_push_devices.user_id=EXCLUDED.user_id THEN native_push_devices.enabled ELSE TRUE END,
    user_id=EXCLUDED.user_id,session_hash=EXCLUDED.session_hash,token=EXCLUDED.token,permission_granted=EXCLUDED.permission_granted,updated_at=NOW()`,
    [deviceId,user.id,hash,input.permissionGranted?input.token:null,input.permissionGranted]);
  }
  if(action==='disable')await db.query('UPDATE native_push_devices SET enabled=FALSE,updated_at=NOW() WHERE device_id=$1 AND user_id=$2',[deviceId,user.id]);
  if(action==='settings')await db.query('UPDATE native_push_devices SET enabled=$3,times=$4,updated_at=NOW() WHERE device_id=$1 AND user_id=$2',[deviceId,user.id,input.enabled,JSON.stringify(input.times)]);
  if(action==='test'){
   if(!fcmConfigured())return json({error:'서버 알림 연결을 준비 중이에요.'},503);
   const row=(await db.query(`UPDATE native_push_devices d SET last_test_at=NOW() FROM sessions s
    WHERE d.device_id=$1 AND d.user_id=$2 AND d.session_hash=s.token_hash AND s.expires_at>NOW()
    AND d.enabled AND d.permission_granted AND d.token IS NOT NULL
    AND (d.last_test_at IS NULL OR d.last_test_at<NOW()-INTERVAL '1 minute') RETURNING d.token`,[deviceId,user.id])).rows[0];
   if(!row)return json({error:'알림을 켠 뒤 다시 시도해 주세요. 테스트는 1분에 한 번 보낼 수 있어요.'},429);
   try{await sendFcm(row.token,'끼니플랜 테스트 알림','알림을 누르면 식사 기록으로 이동해요.','/record','meal-test');}
   catch(error){if(invalidFcmToken(error))await db.query('UPDATE native_push_devices SET token=NULL,permission_granted=FALSE WHERE device_id=$1 AND token=$2',[deviceId,row.token]);return json({error:'알림을 보내지 못했어요. 앱을 다시 열어 시도해 주세요.'},503);}
  }
  const row=(await db.query('SELECT enabled,permission_granted,times FROM native_push_devices WHERE device_id=$1 AND user_id=$2',[deviceId,user.id])).rows[0];
  return json({registered:Boolean(row),subscribed:Boolean(row?.enabled&&row?.permission_granted),permissionGranted:Boolean(row?.permission_granted),times:row?.times??DEFAULT_NATIVE_TIMES,configured:fcmConfigured(),tested:action==='test'});
 }catch{return json({error:'앱 알림 설정을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.'},503);}
}
