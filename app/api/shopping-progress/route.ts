import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,sameOrigin,authFailure} from '../../../lib/auth';
import {getPool} from '../../../lib/db';
import {parseStock} from '../../../lib/shopping-progress';
export const runtime='nodejs';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
function scopeOf(request:NextRequest){const scope=request.nextUrl.searchParams.get('scope');return scope==='products'||scope==='ingredients'?scope:null;}
export async function GET(request:NextRequest){
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  const scope=scopeOf(request);if(!scope)return authFailure('목록을 확인해 주세요.',400);
  const result=await getPool().query('SELECT stock,version FROM shopping_progress WHERE user_id=$1 AND scope=$2',[user.id,scope]);
  return json(result.rows[0]??{stock:{},version:0});
 }catch{return authFailure('구매 상태를 불러오지 못했어요. 다시 시도해 주세요.',503);}
}
export async function PUT(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  const scope=scopeOf(request);if(!scope)return authFailure('목록을 확인해 주세요.',400);
  let input;try{input=await request.json();}catch{return authFailure('입력을 확인해 주세요.',400);}
  const stock=parseStock(input?.stock),version=input?.version;
  if(!stock||!Number.isSafeInteger(version)||version<0)return authFailure('수량과 구매 상태를 확인해 주세요.',400);
  const result=version===0
   ?await getPool().query('INSERT INTO shopping_progress(user_id,scope,stock,version) VALUES($1,$2,$3,1) ON CONFLICT DO NOTHING RETURNING stock,version',[user.id,scope,JSON.stringify(stock)])
   :await getPool().query('UPDATE shopping_progress SET stock=$3,version=version+1,updated_at=NOW() WHERE user_id=$1 AND scope=$2 AND version=$4 RETURNING stock,version',[user.id,scope,JSON.stringify(stock),version]);
  if(!result.rowCount)return authFailure('다른 화면에서 목록이 변경됐어요. 다시 불러온 뒤 변경해 주세요.',409);
  return json(result.rows[0]);
 }catch{return authFailure('구매 상태를 저장하지 못했어요. 다시 불러와 확인해 주세요.',503);}
}
