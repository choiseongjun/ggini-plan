import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,sameOrigin,authFailure} from '../../../../lib/auth';
import {getPool} from '../../../../lib/db';
import {pantryToday} from '../../../../lib/pantry-inventory';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
 const v=await request.json().catch(()=>null);if(typeof v?.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.id))return authFailure('메뉴를 확인해 주세요.',400);
 const db=await getPool().connect();try{
 await db.query('BEGIN');const m=(await db.query("SELECT name,to_char(day,'YYYY-MM-DD') AS day,slot,nutrition FROM manual_meal_plans WHERE user_id=$1 AND id=$2 FOR UPDATE",[user.id,v.id])).rows[0];
 if(!m||m.day>pantryToday()){await db.query('ROLLBACK');return authFailure('오늘 또는 지난 날짜의 메뉴만 기록할 수 있어요.',400);}
 const time=m.day===pantryToday()?new Date().toISOString():`${m.day}T${({breakfast:'08',lunch:'12',dinner:'19',snack:'15'} as Record<string,string>)[m.slot]}:00:00+09:00`;
 const n=m.nutrition;
 await db.query(`INSERT INTO food_intake_logs(user_id,id,product_id,product_name,portions,packs,calories,protein,carbs,fat,sugar,sodium,stock_item,cost,eaten_at,meal_slot,request_id)
 VALUES($1,$2,$3,$4,1,1,$5,$6,$7,$8,$9,$10,'{"kind":"none"}',NULL,$11,$12,$2)
 ON CONFLICT(user_id,id) DO UPDATE SET undone_at=NULL WHERE food_intake_logs.product_id=EXCLUDED.product_id`,[user.id,v.id,`${n?'photo:':'manual:'}${v.id}`,m.name,n?.calories??null,n?.protein??null,n?.carbs??null,n?.fat??null,n?.sugar??null,n?.sodium??null,time,m.slot]);
 await db.query('COMMIT');return NextResponse.json({saved:true},{headers:{'Cache-Control':'no-store'}});
 }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }catch{return authFailure('먹은 기록을 저장하지 못했어요. 다시 시도해 주세요.',503);}
}
