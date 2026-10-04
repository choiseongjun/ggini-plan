import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,sameOrigin,authFailure} from '../../../../lib/auth';
import {getPool} from '../../../../lib/db';
import {parseServerPantry} from '../../../../lib/pantry-server-input';
export const runtime='nodejs';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:NextRequest){
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  const r=await getPool().query('SELECT inventory,version FROM pantry_inventory WHERE user_id=$1',[user.id]);
  return json({userId:user.id,exists:!!r.rows.length,...(r.rows[0]??{inventory:[],version:0})});
 }catch{return authFailure('내 주방을 불러오지 못했어요.',503);}
}
export async function PUT(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  const raw=await request.text();if(raw.length>100000)return authFailure('재료 목록이 너무 커요.',413);
  let input;try{input=JSON.parse(raw);}catch{return authFailure('입력을 확인해 주세요.',400);}
  const inventory=parseServerPantry(input?.inventory);
  if(!inventory||!Number.isSafeInteger(input.version)||input.version<0||typeof input.requestId!=='string'||!/^[0-9a-f-]{36}$/i.test(input.requestId))return authFailure('재료 목록을 확인해 주세요.',400);
  if(input.userId!==user.id)return authFailure('로그인 계정이 바뀌었어요.',409);
  const db=await getPool().connect();
  try{
   await db.query('BEGIN');
   await db.query('INSERT INTO pantry_inventory(user_id) VALUES($1) ON CONFLICT DO NOTHING',[user.id]);
   const current=(await db.query('SELECT inventory,version,request_id FROM pantry_inventory WHERE user_id=$1 FOR UPDATE',[user.id])).rows[0];
   if(current.request_id===input.requestId){await db.query('COMMIT');return json({userId:user.id,inventory:current.inventory,version:current.version});}
   if(current.version!==input.version){await db.query('ROLLBACK');return json({error:'다른 화면에서 재료가 변경됐어요. 새로 불러온 뒤 다시 수정해 주세요.',conflict:true},409);}
   const result=(await db.query('UPDATE pantry_inventory SET inventory=$2,version=version+1,request_id=$3,updated_at=NOW() WHERE user_id=$1 RETURNING inventory,version',[user.id,JSON.stringify(inventory),input.requestId])).rows[0];
   await db.query('COMMIT');return json({userId:user.id,...result});
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }catch{return authFailure('서버에 저장하지 못했어요. 다시 시도해 주세요.',503);}
}
