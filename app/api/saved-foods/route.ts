import {NextRequest} from 'next/server';
import {sessionUser,sameOrigin} from '../../../lib/auth';
import {getPool} from '../../../lib/db';
import {displayFoodName} from '../../../lib/food-reference';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:NextRequest){
 try{const user=await sessionUser(request);if(!user)return json({error:'로그인하면 저장한 메뉴를 볼 수 있어요.'},401);
 const {rows}=await getPool().query(`SELECT s.food_code AS code,r.name,r.brand,p.slug,s.created_at FROM saved_foods s JOIN food_reference r ON r.food_code=s.food_code LEFT JOIN LATERAL(SELECT slug FROM food_pages WHERE food_code=s.food_code ORDER BY slug LIMIT 1)p ON TRUE WHERE s.user_id=$1 ORDER BY s.created_at DESC LIMIT 200`,[user.id]);return json({items:rows.map(row=>({...row,name:displayFoodName(row.name)}))});
 }catch{return json({error:'저장한 메뉴를 불러오지 못했어요.'},503);}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return json({error:'요청 출처를 확인해 주세요.'},403);
 try{const user=await sessionUser(request);if(!user)return json({error:'로그인하면 계정에 메뉴를 보관할 수 있어요.'},401);
 let body;try{body=await request.json();}catch{return json({error:'요청을 확인해 주세요.'},400);}
 if(!body||typeof body.code!=='string'||body.code.length<1||body.code.length>100||!['save','remove'].includes(body.action))return json({error:'메뉴를 확인해 주세요.'},400);
 const db=await getPool().connect();try{await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock($1::bigint)',[user.id]);
 if(body.action==='remove')await db.query('DELETE FROM saved_foods WHERE user_id=$1 AND food_code=$2',[user.id,body.code]);
 else{
  const existing=await db.query('SELECT 1 FROM saved_foods WHERE user_id=$1 AND food_code=$2',[user.id,body.code]);
  if(!existing.rowCount){const count=await db.query('SELECT count(*)::int AS n FROM saved_foods WHERE user_id=$1',[user.id]);if(count.rows[0].n>=200){await db.query('ROLLBACK');return json({error:'최대 200개까지 보관할 수 있어요. 기존 메뉴를 정리해 주세요.'},409);}}
  const result=await db.query('INSERT INTO saved_foods(user_id,food_code) SELECT $1,r.food_code FROM food_reference r WHERE r.food_code=$2 AND EXISTS(SELECT 1 FROM food_pages WHERE food_code=r.food_code) ON CONFLICT DO NOTHING RETURNING food_code',[user.id,body.code]);
  if(!existing.rowCount&&!result.rowCount){await db.query('ROLLBACK');return json({error:'저장할 메뉴를 찾지 못했어요.'},404);}
 }await db.query('COMMIT');return json({saved:body.action==='save'});
 }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }catch{return json({error:'메뉴를 저장하지 못했어요. 다시 시도해 주세요.'},503);}
}
