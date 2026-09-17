import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,sameOrigin,authFailure} from '../../../lib/auth';
import {getPool} from '../../../lib/db';
import {parseConditions} from '../../../lib/shopping-plan';
import {parseStock,changeStock} from '../../../lib/shopping-progress';
export const runtime='nodejs';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
function scopeOf(request:NextRequest){const scope=request.nextUrl.searchParams.get('scope');return scope==='products'||scope==='ingredients'?scope:null;}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  const scope=scopeOf(request);if(!scope)return authFailure('목록을 확인해 주세요.',400);
  let input;try{input=await request.json();}catch{return authFailure('입력을 확인해 주세요.',400);}
  if(input?.targetUserId!==user.id)return authFailure('로그인 계정이 바뀌었어요. 다시 불러와 주세요.',409);
  const stock=parseStock(input?.stock),id=input?.importId;
  if(!stock||typeof id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return authFailure('비회원 목록을 확인해 주세요.',400);
  const db=await getPool().connect();
  try{
   await db.query('BEGIN');
   const claimed=await db.query('INSERT INTO shopping_progress_imports(import_id,user_id,scope) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING import_id',[id,user.id,scope]);
   if(!claimed.rowCount){
    const previous=await db.query('SELECT user_id::text,scope FROM shopping_progress_imports WHERE import_id=$1',[id]);
    if(previous.rows[0]?.user_id!==user.id||previous.rows[0]?.scope!==scope){await db.query('ROLLBACK');return authFailure('이미 다른 목록에 통합된 기록이에요.',409);}
   }
   await db.query('INSERT INTO shopping_progress(user_id,scope,stock,version) VALUES($1,$2,\'{}\',0) ON CONFLICT DO NOTHING',[user.id,scope]);
   const current=await db.query('SELECT stock,version FROM shopping_progress WHERE user_id=$1 AND scope=$2 FOR UPDATE',[user.id,scope]);
   let result=current.rows[0];
   if(claimed.rowCount){
    let next=parseStock(result.stock);if(!next)throw new Error('Invalid stored stock');
    try{for(const item of Object.values(stock)){
     if(item.ordered)next=changeStock(next,[{item,quantity:item.ordered}],'order');
     if(item.owned)next=changeStock(next,[{item,quantity:item.owned}],'have');
    }}catch{await db.query('ROLLBACK');return authFailure('수량이나 단위가 달라 목록을 합치지 못했어요. 비회원 기록은 보관되어 있어요.',409);}
    result=(await db.query('UPDATE shopping_progress SET stock=$3,version=version+1,updated_at=NOW() WHERE user_id=$1 AND scope=$2 RETURNING stock,version',[user.id,scope,JSON.stringify(next)])).rows[0];
   }
   await db.query('COMMIT');return json(result);
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }catch{return authFailure('비회원 목록을 합치지 못했어요. 다시 불러와 주세요.',503);}
}
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
  const reset=input?.resetConditions===undefined?undefined:parseConditions(input.resetConditions);
  if(reset===null||(reset&&(scope!=='products'||Object.keys(stock).length>0)))return authFailure('초기화할 목록을 확인해 주세요.',400);
  const db=await getPool().connect();
  try{
   await db.query('BEGIN');
   const result=version===0
    ?await db.query('INSERT INTO shopping_progress(user_id,scope,stock,version) VALUES($1,$2,$3,1) ON CONFLICT DO NOTHING RETURNING stock,version',[user.id,scope,JSON.stringify(stock)])
    :await db.query('UPDATE shopping_progress SET stock=$3,version=version+1,updated_at=NOW() WHERE user_id=$1 AND scope=$2 AND version=$4 RETURNING stock,version',[user.id,scope,JSON.stringify(stock),version]);
   if(!result.rowCount){await db.query('ROLLBACK');return authFailure('다른 화면에서 목록이 변경됐어요. 다시 불러온 뒤 변경해 주세요.',409);}
   if(reset)await db.query("INSERT INTO shopping_plans(user_id,conditions,meal_ids) VALUES($1,$2,'[]')",[user.id,JSON.stringify({...reset,owned:[],supply:{}})]);
   await db.query('COMMIT');return json(result.rows[0]);
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }catch{return authFailure('구매 상태를 저장하지 못했어요. 다시 불러와 확인해 주세요.',503);}
}
